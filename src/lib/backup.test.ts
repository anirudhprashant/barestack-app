import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-in for the PocketBase-backed api module. vi.mock is
// hoisted above imports, so its state has to come from vi.hoisted.
const { store, binding, reset } = vi.hoisted(() => {
    const store: Record<string, Record<string, unknown>[]> = {};
    let seq = 0;
    const binding = (name: string) => ({
        create: async (data: Record<string, unknown>) => {
            const rec = { ...data, id: `${name}_new_${++seq}` };
            (store[name] ||= []).push(rec);
            return rec;
        },
    });
    const reset = () => {
        for (const k of Object.keys(store)) delete store[k];
        seq = 0;
    };
    return { store, binding, reset };
});

vi.mock('./api', () => ({
    contacts: binding('contacts'),
    deals: binding('deals'),
    projects: binding('projects'),
    tasks: binding('tasks'),
    invoices: binding('invoices'),
    timeEntries: binding('time_entries'),
    expenses: binding('expenses'),
    notes: binding('notes'),
    businessProfiles: binding('business_profiles'),
}));

import { parseBackup, restoreBackup, buildBackup, BACKUP_FORMAT } from './backup';
import type { AppState } from '../../types';

const sample = {
    format: BACKUP_FORMAT,
    version: 1,
    exported_at: '2026-09-26T00:00:00Z',
    collections: {
        contacts: [{ id: 'c1', name: 'Ada', email: 'a@x.io', tags: ['vip'], import_batch_id: 'old_batch', user: 'someone_else' }],
        deals: [{ id: 'd1', contact_id: 'c1', value: 10, stage: 'Lead' }, { id: 'd2', contact_id: 'missing', value: 1, stage: 'Lead' }],
        projects: [{ id: 'p1', name: 'P', client_id: 'c1', status: 'Active' }],
        tasks: [{ id: 't1', title: 'T', project_id: 'p1', assigned_to: 'old_user' }],
        invoices: [{ id: 'i1', invoice_number: '2026-001', client_id: 'c1', line_items: [] }],
        time_entries: [
            { id: 'te1', project_id: 'p1', task_id: 't1', invoice_id: 'i1', hours: 2 },
            { id: 'te2', project_id: 'p1', task_id: '', invoice_id: '', hours: 1 },
        ],
        expenses: [{ id: 'e1', amount: 5, project_id: 'p1' }, { id: 'e2', amount: 7, project_id: 'gone' }],
        notes: [{ id: 'n1', contact_id: 'c1', content: 'hi' }],
        business_profile: { id: 'bp', business_name: 'Acme', currency: 'EUR' },
    },
};

describe('backup restore', () => {
    beforeEach(() => reset());

    it('rejects files that are not backups', () => {
        expect(() => parseBackup('nope')).toThrow(/not valid JSON/);
        expect(() => parseBackup('{"format":"x"}')).toThrow(/not a BareStackOS backup/);
        expect(() => parseBackup(JSON.stringify({ ...sample, version: 99 }))).toThrow(/newer version/);
    });

    it('remaps every cross-reference to the new ids and stamps the new owner', async () => {
        const backup = parseBackup(JSON.stringify(sample));
        const result = await restoreBackup(backup, 'me', { hasBusinessProfile: false });

        const contact = store.contacts[0];
        const project = store.projects[0];
        const task = store.tasks[0];
        const invoice = store.invoices[0];

        expect(contact.user).toBe('me');
        expect(contact.import_batch_id).toBe('');
        expect(contact.id).not.toBe('c1');

        expect(store.deals).toHaveLength(1); // the orphaned deal is skipped
        expect(store.deals[0].contact_id).toBe(contact.id);
        expect(project.client_id).toBe(contact.id);
        expect(task.project_id).toBe(project.id);
        expect(task.assigned_to).toBe('me');
        expect(invoice.client_id).toBe(contact.id);

        const billed = store.time_entries.find(t => t.hours === 2)!;
        expect(billed.project_id).toBe(project.id);
        expect(billed.task_id).toBe(task.id);
        expect(billed.invoice_id).toBe(invoice.id);
        expect(store.time_entries.find(t => t.hours === 1)!.invoice_id).toBe('');

        // Expenses survive even when their project is gone (just unlinked).
        expect(store.expenses.map(e => e.project_id)).toEqual([project.id, '']);
        expect(store.notes[0].contact_id).toBe(contact.id);
        expect(store.business_profiles[0].business_name).toBe('Acme');

        expect(result.skipped.deals).toBe(1);
        expect(result.created.time_entries).toBe(2);
        // No record keeps a client-supplied id.
        for (const rows of Object.values(store)) for (const r of rows) expect(String(r.id)).toMatch(/_new_/);
    });

    it('does not create a second business profile', async () => {
        await restoreBackup(parseBackup(JSON.stringify(sample)), 'me', { hasBusinessProfile: true });
        expect(store.business_profiles).toBeUndefined();
    });

    it('round-trips app state through buildBackup without server fields', () => {
        const state = {
            contacts: [{ id: 'c', name: 'A', email: 'a@a', phone: '', company: '', tags: [], user: 'u', created: 'x', collectionId: 'y' }],
            deals: [], projects: [], tasks: [], invoices: [], timeEntries: [], expenses: [], notes: [],
            recentActivity: [], importBatches: [],
            businessProfile: { business_name: '' },
            userProfile: { name: '', email: '' },
        } as unknown as AppState;
        const b = buildBackup(state);
        expect(b.collections.contacts[0]).toEqual({ id: 'c', name: 'A', email: 'a@a', phone: '', company: '', tags: [] });
        expect(b.collections.business_profile).toBeNull();
    });
});
