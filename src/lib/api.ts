import { pb } from './pocketbase';
import type { RecordModel } from 'pocketbase';
import {
    sanitizeId,
    sanitizeCreatePayload,
    ALLOWED_CREATE_COLLECTIONS,
} from './validation';

type Payload = Record<string, unknown>;

// --- Record shape adapters ---
// contacts.tags is a text column holding a comma-separated list, but the app
// works with string[]. Sending an array straight to a text field makes
// PocketBase store "" (tags were silently lost), and reading "" back into code
// that expects an array crashed the Edit Contact form. Convert at the edge.
export function tagsToText(tags: unknown): string {
    if (Array.isArray(tags)) {
        return tags.map(t => String(t).trim()).filter(Boolean).join(', ');
    }
    return typeof tags === 'string' ? tags : '';
}

export function tagsFromText(tags: unknown): string[] {
    if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
    if (typeof tags !== 'string') return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
}

function toServer(collection: string, data: Payload): Payload {
    if (collection === 'contacts' && 'tags' in data) {
        return { ...data, tags: tagsToText(data.tags) };
    }
    return data;
}

export function fromServer<T extends RecordModel>(collection: string, record: T): T {
    if (collection === 'contacts') {
        return { ...record, tags: tagsFromText((record as Payload).tags) };
    }
    if (collection === 'invoices' && !Array.isArray((record as Payload).line_items)) {
        return { ...record, line_items: [] };
    }
    return record;
}

// --- Generic CRUD helpers ---
// Single defense-in-depth chokepoint for all writes: enforce input bounds that
// match the real PocketBase field caps (see validation.ts) before the request
// leaves the client. Fail-soft — never throws on valid app data; only truncates
// oversized / drops out-of-enum / strips a client-supplied `id`. PocketBase is
// the final arbiter. Unknown collections are rejected to keep the allow-list honest.
function assertAllowed(collection: string) {
    if (!ALLOWED_CREATE_COLLECTIONS.includes(collection)) {
        throw new Error(`Refusing write on unallowlisted collection: ${collection}`);
    }
}

async function create(collection: string, data: Payload): Promise<RecordModel> {
    assertAllowed(collection);
    const sanitized = sanitizeCreatePayload(collection, toServer(collection, data));
    const rec = await pb.collection(collection).create(sanitized, { requestKey: null });
    return fromServer(collection, rec);
}

async function update(collection: string, id: string, data: Payload): Promise<RecordModel> {
    assertAllowed(collection);
    const sanitized = sanitizeCreatePayload(collection, toServer(collection, data));
    // Owner and server-managed fields never change on update (the server rule
    // enforces the owner freeze; stripping them here keeps requests clean).
    delete sanitized.user;
    delete sanitized.user_id;
    delete sanitized.created;
    delete sanitized.updated;
    delete sanitized.collectionId;
    delete sanitized.collectionName;
    delete sanitized.expand;
    const rec = await pb.collection(collection).update(sanitizeId(id), sanitized, { requestKey: null });
    return fromServer(collection, rec);
}

// Deletes are idempotent: a record that is already gone (deleted in another
// tab, by a cascade, or by realtime) counts as success, so multi-step
// cascades don't fail half-way on a 404.
export const isNotFound = (e: unknown) => (e as { status?: number })?.status === 404;

async function remove(collection: string, id: string): Promise<void> {
    assertAllowed(collection);
    try {
        await pb.collection(collection).delete(sanitizeId(id), { requestKey: null });
    } catch (e) {
        if (!isNotFound(e)) throw e;
    }
}

// Every record the user owns, paged 500 at a time. The old single getList(1, 500)
// silently dropped everything past the 500th record.
async function listAll(collection: string, userId: string, sort = '-created,-id'): Promise<RecordModel[]> {
    const safeId = sanitizeId(userId);
    const items = await pb.collection(collection).getFullList({
        filter: `user="${safeId}"`,
        sort,
        batch: 500,
        requestKey: null,
    });
    return items.map(r => fromServer(collection, r));
}

// --- Collection bindings ---
function crud(collection: string, sort?: string) {
    return {
        fetch: (userId: string) => listAll(collection, userId, sort),
        create: (data: Payload) => create(collection, data),
        update: (id: string, data: Payload) => update(collection, id, data),
        remove: (id: string) => remove(collection, id),
    };
}

export const contacts = crud('contacts');
export const deals = crud('deals');
export const projects = crud('projects');
export const tasks = crud('tasks');
export const invoices = crud('invoices');
export const timeEntries = crud('time_entries', '-date,-created');
export const expenses = crud('expenses', '-date,-created');
export const notes = crud('notes');
export const importBatches = crud('import_batches');
export const businessProfiles = crud('business_profiles');
export const invoiceShares = crud('invoice_shares');

// Public, unauthenticated read of a shared invoice. The server only returns it
// when the secret token matches (see migration 1780900000).
export async function fetchPublicShare(id: string, token: string): Promise<RecordModel> {
    return pb.collection('invoice_shares').getOne(sanitizeId(id), { query: { token }, requestKey: null });
}

export const recentActivity = {
    // The feed only ever shows recent entries; cap it rather than paging the
    // whole history on every load.
    fetch: async (userId: string, limit = 200): Promise<RecordModel[]> => {
        const safeId = sanitizeId(userId);
        const res = await pb.collection('recent_activity').getList(1, limit, {
            filter: `user="${safeId}"`,
            sort: '-timestamp',
            requestKey: null,
        });
        return res.items;
    },
    create: (data: Payload) => create('recent_activity', data),
};

// Bulk contact insert for imports, in chunks so a large file doesn't open
// thousands of concurrent requests.
export async function createContactsBulk(rows: Payload[], chunkSize = 25): Promise<RecordModel[]> {
    const out: RecordModel[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        out.push(...await Promise.all(chunk.map(c => create('contacts', c))));
    }
    return out;
}
