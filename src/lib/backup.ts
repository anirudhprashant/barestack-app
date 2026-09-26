import * as api from './api';
import type { AppState } from '../../types';

// Portable JSON backup of everything a user owns.
//
// Restoring creates *new* records in the signed-in account (it never deletes
// or overwrites), remapping every cross-reference (contact -> deal/project/
// invoice/note, project -> task/time/expense, invoice -> billed time) to the
// new ids. That makes it work across instances too: export from the hosted
// cloud, restore into a self-hosted install, or the other way round.

export const BACKUP_FORMAT = 'barestack-backup';
export const BACKUP_VERSION = 1;

type Row = Record<string, unknown>;

export interface Backup {
    format: typeof BACKUP_FORMAT;
    version: number;
    exported_at: string;
    collections: {
        contacts: Row[];
        deals: Row[];
        projects: Row[];
        tasks: Row[];
        invoices: Row[];
        time_entries: Row[];
        expenses: Row[];
        notes: Row[];
        business_profile: Row | null;
    };
}

const SERVER_FIELDS = ['user', 'user_id', 'created', 'updated', 'collectionId', 'collectionName', 'expand'];

function strip(row: object): Row {
    const out: Row = { ...(row as Row) };
    for (const f of SERVER_FIELDS) delete out[f];
    return out;
}

export function buildBackup(data: AppState): Backup {
    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exported_at: new Date().toISOString(),
        collections: {
            contacts: data.contacts.map(strip),
            deals: data.deals.map(strip),
            projects: data.projects.map(strip),
            tasks: data.tasks.map(strip),
            invoices: data.invoices.map(strip),
            time_entries: data.timeEntries.map(strip),
            expenses: data.expenses.map(strip),
            notes: data.notes.map(strip),
            business_profile: data.businessProfile.id ? strip(data.businessProfile) : null,
        },
    };
}

export function parseBackup(text: string): Backup {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('This file is not valid JSON.');
    }
    const b = parsed as Partial<Backup>;
    if (!b || b.format !== BACKUP_FORMAT || typeof b.version !== 'number' || !b.collections) {
        throw new Error('This is not a BareStackOS backup file.');
    }
    if (b.version > BACKUP_VERSION) {
        throw new Error('This backup was made by a newer version of BareStackOS. Update the app and try again.');
    }
    const c = b.collections as Partial<Backup['collections']>;
    const arr = (v: unknown) => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') as Row[] : []);
    return {
        format: BACKUP_FORMAT,
        version: b.version,
        exported_at: String(b.exported_at || ''),
        collections: {
            contacts: arr(c.contacts),
            deals: arr(c.deals),
            projects: arr(c.projects),
            tasks: arr(c.tasks),
            invoices: arr(c.invoices),
            time_entries: arr(c.time_entries),
            expenses: arr(c.expenses),
            notes: arr(c.notes),
            business_profile: c.business_profile && typeof c.business_profile === 'object' ? c.business_profile as Row : null,
        },
    };
}

export function backupCounts(b: Backup): Record<string, number> {
    const c = b.collections;
    return {
        contacts: c.contacts.length,
        deals: c.deals.length,
        projects: c.projects.length,
        tasks: c.tasks.length,
        invoices: c.invoices.length,
        time_entries: c.time_entries.length,
        expenses: c.expenses.length,
        notes: c.notes.length,
    };
}

export interface RestoreResult {
    created: Record<string, number>;
    skipped: Record<string, number>;
}

export async function restoreBackup(
    backup: Backup,
    userId: string,
    opts: { hasBusinessProfile: boolean; onProgress?: (label: string, done: number, total: number) => void },
): Promise<RestoreResult> {
    const created: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    const idMap = {
        contacts: new Map<string, string>(),
        projects: new Map<string, string>(),
        tasks: new Map<string, string>(),
        invoices: new Map<string, string>(),
    };

    const run = async (
        label: string,
        rows: Row[],
        create: (data: Row) => Promise<{ id: string }>,
        prepare: (row: Row) => Row | null,
        map?: Map<string, string>,
    ) => {
        created[label] = 0;
        skipped[label] = 0;
        let done = 0;
        for (const row of rows) {
            const oldId = typeof row.id === 'string' ? row.id : '';
            const prepared = prepare(row);
            if (!prepared) {
                skipped[label]++;
            } else {
                const { id: _drop, ...rest } = prepared;
                try {
                    const rec = await create({ ...rest, user: userId });
                    created[label]++;
                    if (map && oldId) map.set(oldId, rec.id);
                } catch (e) {
                    console.error(`Restore: could not create ${label}`, e);
                    skipped[label]++;
                }
            }
            opts.onProgress?.(label, ++done, rows.length);
        }
    };

    const c = backup.collections;
    const ref = (m: Map<string, string>, v: unknown) => (typeof v === 'string' && v ? m.get(v) || null : null);

    await run('contacts', c.contacts, api.contacts.create, r => ({ ...strip(r), import_batch_id: '' }), idMap.contacts);
    await run('deals', c.deals, api.deals.create, r => {
        const contact = ref(idMap.contacts, r.contact_id);
        return contact ? { ...strip(r), contact_id: contact } : null;
    });
    await run('projects', c.projects, api.projects.create, r => {
        const client = ref(idMap.contacts, r.client_id);
        return client ? { ...strip(r), client_id: client } : null;
    }, idMap.projects);
    await run('tasks', c.tasks, api.tasks.create, r => {
        const project = ref(idMap.projects, r.project_id);
        return project ? { ...strip(r), project_id: project, assigned_to: userId } : null;
    }, idMap.tasks);
    await run('invoices', c.invoices, api.invoices.create, r => {
        const client = ref(idMap.contacts, r.client_id);
        return client ? { ...strip(r), client_id: client } : null;
    }, idMap.invoices);
    await run('time_entries', c.time_entries, api.timeEntries.create, r => {
        const project = ref(idMap.projects, r.project_id);
        if (!project) return null;
        return {
            ...strip(r),
            project_id: project,
            task_id: ref(idMap.tasks, r.task_id) || '',
            invoice_id: ref(idMap.invoices, r.invoice_id) || '',
        };
    });
    await run('expenses', c.expenses, api.expenses.create, r => ({ ...strip(r), project_id: ref(idMap.projects, r.project_id) || '' }));
    await run('notes', c.notes, api.notes.create, r => {
        const contact = ref(idMap.contacts, r.contact_id);
        return contact ? { ...strip(r), contact_id: contact } : null;
    });

    if (c.business_profile && !opts.hasBusinessProfile) {
        try {
            const { id: _drop, ...rest } = strip(c.business_profile);
            await api.businessProfiles.create({ ...rest, user: userId });
            created.business_profile = 1;
        } catch (e) {
            console.error('Restore: could not create business profile', e);
        }
    }

    return { created, skipped };
}
