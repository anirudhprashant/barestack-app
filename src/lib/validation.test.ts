import { describe, it, expect } from 'vitest';
import { sanitizeId, sanitizeString, sanitizeArray, validate, ContactSchema, sanitizeCreatePayload, ALLOWED_CREATE_COLLECTIONS } from './validation';

// The security-critical path: sanitizeId is the only thing standing between
// user input and a PocketBase filter string. A regression here reopens filter
// injection, so these cases must stay green.
describe('sanitizeId', () => {
    it('accepts valid PocketBase-style ids', () => {
        expect(sanitizeId('abc123XYZ')).toBe('abc123XYZ');
        expect(sanitizeId('user_id-01')).toBe('user_id-01');
    });

    it('rejects filter-injection payloads', () => {
        expect(() => sanitizeId('a" || user="b')).toThrow('Invalid ID format');
        expect(() => sanitizeId('1 || 1=1')).toThrow('Invalid ID format');
        expect(() => sanitizeId("'; DROP")).toThrow('Invalid ID format');
        expect(() => sanitizeId('')).toThrow('Invalid ID format');
    });

    it('rejects non-string input', () => {
        expect(() => sanitizeId(null)).toThrow('Invalid ID format');
        expect(() => sanitizeId(42)).toThrow('Invalid ID format');
        expect(() => sanitizeId({})).toThrow('Invalid ID format');
    });
});

describe('sanitizeString', () => {
    it('trims and collapses whitespace', () => {
        expect(sanitizeString('  hello   world  ')).toBe('hello world');
    });
    it('enforces max length', () => {
        expect(sanitizeString('abcdef', 3)).toBe('abc');
    });
    it('throws on non-string', () => {
        expect(() => sanitizeString(123)).toThrow('Expected string');
    });
});

describe('sanitizeArray', () => {
    it('keeps only non-empty strings', () => {
        expect(sanitizeArray(['a', '', '  b  ', 5, null])).toEqual(['a', 'b']);
    });
    it('returns [] for non-arrays', () => {
        expect(sanitizeArray('nope')).toEqual([]);
    });
});

describe('validate', () => {
    it('passes a valid contact through', () => {
        const c = { name: 'Jane', email: 'jane@example.com' };
        expect(validate(ContactSchema, c)).toMatchObject(c);
    });
    it('throws a descriptive error on bad data', () => {
        expect(() => validate(ContactSchema, { name: '', email: 'nope' })).toThrow(/Validation failed/);
    });
});

// Defense-in-depth create sanitizer. The security guarantee: it truncates
// oversized strings, drops out-of-enum selects, clamps numbers, and strips a
// client-supplied `id` — but NEVER throws or alters valid app-shaped payloads
// (the anti-regression guard). Caps match the real PocketBase field maxes.
describe('sanitizeCreatePayload', () => {
    it('truncates oversized strings to the verified server max', () => {
        const long = 'x'.repeat(600);
        const out = sanitizeCreatePayload('contacts', { name: long, email: 'a@b.co', user: 'u1' });
        expect((out.name as string).length).toBe(500);
        // untouched fields preserved
        expect(out.email).toBe('a@b.co');
        expect(out.user).toBe('u1');
    });

    it('drops an out-of-enum select value (fail-soft, no throw)', () => {
        const out = sanitizeCreatePayload('deals', { contact_id: 'c1', stage: 'BogusStage', value: 10, user: 'u1' });
        expect('stage' in out).toBe(false);
        // valid enum survives
        const ok = sanitizeCreatePayload('deals', { contact_id: 'c1', stage: 'Won', value: 10, user: 'u1' });
        expect(ok.stage).toBe('Won');
    });

    it('clamps numbers to safe bounds', () => {
        const out = sanitizeCreatePayload('invoices', {
            invoice_number: 'INV-1', client_id: 'c1', tax_rate: 999, status: 'Draft',
            issue_date: '2026-01-01', due_date: '2026-01-02', user: 'u1',
        });
        expect(out.tax_rate).toBe(100);          // max 100
        const neg = sanitizeCreatePayload('expenses', { amount: -50, category: 'Other', date: '2026-01-01', description: 'x', user: 'u1' });
        expect(neg.amount).toBe(0);
    });

    it('strips a client-supplied id (ImportModal duplicate "create new" path)', () => {
        const out = sanitizeCreatePayload('contacts', { id: 'SERVER-ID-12345', name: 'A', email: 'a@b.co', user: 'u1' });
        expect('id' in out).toBe(false);
    });

    it('caps the line_items json array length and per-item fields', () => {
        // Anti-storage-abuse: a 500+ item payload must be truncated; oversized per-item text clamped.
        const hugeDesc = 'y'.repeat(600);
        const items = Array.from({ length: 600 }, () => ({ description: hugeDesc, quantity: 1, rate: 2 }));
        const out = sanitizeCreatePayload('invoices', {
            invoice_number: 'INV-1', client_id: 'c1', status: 'Draft',
            issue_date: '2026-01-01', due_date: '2026-01-02', line_items: items, user: 'u1',
        });
        expect((out.line_items as unknown[]).length).toBe(500);
        const first = (out.line_items as unknown[])[0] as { description: string };
        expect(first.description.length).toBe(500);
    });

    it('passes valid app-shaped payloads through UNCHANGED (anti-regression)', () => {
        // Shapes that match what dataStore.tsx / forms actually send. None of these
        // should be altered — if they are, the sanitizer is too tight and will break the app.
        const contact = sanitizeCreatePayload('contacts', { name: 'Jane Doe', email: 'jane@example.com', phone: '+1 555 123 4567', company: 'Acme', tags: ['lead', 'vip'], user: 'u1' });
        expect(contact).toMatchObject({ name: 'Jane Doe', email: 'jane@example.com', phone: '+1 555 123 4567', company: 'Acme', tags: ['lead', 'vip'], user: 'u1' });

        const deal = sanitizeCreatePayload('deals', { contact_id: 'c1', value: 5000, stage: 'Qualified', last_interaction: '2026-06-19', user: 'u1' });
        expect(deal).toMatchObject({ contact_id: 'c1', value: 5000, stage: 'Qualified', last_interaction: '2026-06-19', user: 'u1' });

        const project = sanitizeCreatePayload('projects', { name: 'Site redesign', client_id: 'c1', status: 'Active', budget: 12000, estimated_hours: 40, user: 'u1' });
        expect(project).toMatchObject({ name: 'Site redesign', client_id: 'c1', status: 'Active', budget: 12000, estimated_hours: 40, user: 'u1' });

        const task = sanitizeCreatePayload('tasks', { title: 'Wireframe home', project_id: 'p1', assigned_to: 'u1', due_date: '2026-07-01', status: 'To Do', user: 'u1' });
        expect(task).toMatchObject({ title: 'Wireframe home', project_id: 'p1', assigned_to: 'u1', due_date: '2026-07-01', status: 'To Do', user: 'u1' });

        const invoice = sanitizeCreatePayload('invoices', {
            invoice_number: 'INV-2026-001', client_id: 'c1', issue_date: '2026-06-19', due_date: '2026-07-19',
            line_items: [{ description: 'Consulting', quantity: 10, rate: 150 }], tax_rate: 20, status: 'Draft', user: 'u1',
        });
        expect(invoice).toMatchObject({
            invoice_number: 'INV-2026-001', client_id: 'c1', issue_date: '2026-06-19', due_date: '2026-07-19',
            line_items: [{ description: 'Consulting', quantity: 10, rate: 150 }], tax_rate: 20, status: 'Draft', user: 'u1',
        });

        const note = sanitizeCreatePayload('notes', { contact_id: 'c1', content: 'Followed up by phone.', user: 'u1' });
        expect(note).toMatchObject({ contact_id: 'c1', content: 'Followed up by phone.', user: 'u1' });

        const activity = sanitizeCreatePayload('recent_activity', { timestamp: '2026-06-19T12:00:00Z', type: 'CONTACT_ADDED', description: 'Added Jane', user: 'u1' });
        expect(activity).toMatchObject({ timestamp: '2026-06-19T12:00:00Z', type: 'CONTACT_ADDED', description: 'Added Jane', user: 'u1' });

        const batch = sanitizeCreatePayload('import_batches', { file_name: 'clients.xlsx', contact_count: 42, user: 'u1' });
        expect(batch).toMatchObject({ file_name: 'clients.xlsx', contact_count: 42, user: 'u1' });
    });

    it('does not mutate the caller input (shallow copy)', () => {
        const input = { name: 'x'.repeat(600), email: 'a@b.co', user: 'u1' } as Record<string, unknown>;
        const snapshot = (input.name as string).length;
        sanitizeCreatePayload('contacts', input);
        expect((input.name as string).length).toBe(snapshot); // original untouched
    });

    it('passes unknown collections through without mutation (allow-list gate is in api.ts)', () => {
        const data = { foo: 'bar' };
        expect(sanitizeCreatePayload('not_a_real_collection', data)).toBe(data);
    });

    it('exposes the allow-list covering exactly the 10 data collections', () => {
        expect(ALLOWED_CREATE_COLLECTIONS.sort()).toEqual(
            ['contacts', 'deals', 'expenses', 'import_batches', 'invoices', 'notes', 'projects', 'recent_activity', 'tasks', 'time_entries'].sort()
        );
    });
});
