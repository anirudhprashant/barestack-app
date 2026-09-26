import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { pb } from './src/lib/pocketbase';
import * as api from './src/lib/api';
import type { PBAuthModel, PBSession } from './src/types/pb-types';
import { DEFAULT_CURRENCY } from './src/lib/format';
import {
    AppState,
    Contact,
    Deal,
    Project,
    Task,
    Invoice,
    TimeEntry,
    Expense,
    RecentActivity,
    Note,
    ImportBatch,
    Creatable,
    UserProfile,
    BusinessProfile,
    InvoiceShare,
} from './types';
import { buildShareSnapshot, newShareToken } from './src/lib/share';
import { restoreBackup } from './src/lib/backup';
import { buildSampleBackup, SAMPLE_TAG } from './src/lib/sampleData';

type WithId<T> = Partial<T> & { id: string };

interface DataContextType {
    data: AppState;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    addContact: (contact: Creatable<Contact>) => Promise<Contact>;
    addMultipleContacts: (contacts: Creatable<Contact>[], batchDetails: Creatable<ImportBatch>) => Promise<void>;
    updateContact: (contact: WithId<Contact>) => Promise<Contact>;
    deleteContact: (id: string) => Promise<void>;
    addDeal: (deal: Creatable<Deal>) => Promise<Deal>;
    updateDeal: (deal: WithId<Deal>) => Promise<Deal>;
    deleteDeal: (id: string) => Promise<void>;
    addProject: (project: Creatable<Project>) => Promise<Project>;
    updateProject: (project: WithId<Project>) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
    addTask: (task: Creatable<Task>) => Promise<Task>;
    updateTask: (task: WithId<Task>) => Promise<Task>;
    deleteTask: (id: string) => Promise<void>;
    addInvoice: (invoice: Creatable<Invoice>) => Promise<Invoice>;
    updateInvoice: (invoice: WithId<Invoice>) => Promise<Invoice>;
    deleteInvoice: (id: string) => Promise<void>;
    addTimeEntry: (timeEntry: Creatable<TimeEntry>) => Promise<TimeEntry>;
    updateTimeEntry: (timeEntry: WithId<TimeEntry>) => Promise<TimeEntry>;
    deleteTimeEntry: (id: string) => Promise<void>;
    addExpense: (expense: Creatable<Expense>) => Promise<Expense>;
    updateExpense: (expense: WithId<Expense>) => Promise<Expense>;
    deleteExpense: (id: string) => Promise<void>;
    addNote: (note: Creatable<Note>) => Promise<Note>;
    updateNote: (note: WithId<Note>) => Promise<Note>;
    deleteNote: (id: string) => Promise<void>;
    // Best-effort: logs and swallows failures so a missing activity entry can
    // never turn a successful save into an error toast.
    addRecentActivity: (activity: Omit<RecentActivity, 'id' | 'user' | 'timestamp'> & { timestamp?: string }) => Promise<void>;
    undoImport: (batchId: string) => Promise<void>;
    saveBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<BusinessProfile>;
    // Create (or refresh) the public link for an invoice.
    shareInvoice: (invoiceId: string) => Promise<InvoiceShare>;
    revokeShare: (invoiceId: string) => Promise<void>;
    // Demo content for exploring the app; everything is tagged "sample".
    loadSampleData: () => Promise<void>;
    removeSampleData: () => Promise<void>;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const defaultBusinessProfile: BusinessProfile = {
    business_name: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    tax_id: '',
    currency: DEFAULT_CURRENCY,
    default_tax_rate: 0,
    payment_terms_days: 30,
    payment_instructions: '',
    invoice_prefix: '',
    invoice_footer: '',
};

const initialState: AppState = {
    contacts: [],
    deals: [],
    projects: [],
    tasks: [],
    invoices: [],
    timeEntries: [],
    expenses: [],
    recentActivity: [],
    notes: [],
    importBatches: [],
    invoiceShares: [],
    businessProfile: defaultBusinessProfile,
    userProfile: { name: 'User', email: '' },
};

type ListKey = Exclude<keyof AppState, 'businessProfile' | 'userProfile'>;

// PocketBase collection -> AppState key, for realtime events.
const REALTIME: [string, ListKey][] = [
    ['contacts', 'contacts'],
    ['deals', 'deals'],
    ['projects', 'projects'],
    ['tasks', 'tasks'],
    ['invoices', 'invoices'],
    ['time_entries', 'timeEntries'],
    ['expenses', 'expenses'],
    ['notes', 'notes'],
    ['recent_activity', 'recentActivity'],
    ['import_batches', 'importBatches'],
    ['invoice_shares', 'invoiceShares'],
];

interface Binding {
    create: (data: Record<string, unknown>) => Promise<unknown>;
    update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    remove: (id: string) => Promise<void>;
}

export const DataProvider: React.FC<{ children: ReactNode; session: PBSession | null }> = ({ children, session }) => {
    const [data, setData] = useState<AppState>(initialState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cascading deletes read the latest state through this ref, so a loop of
    // deletes (bulk delete) never works from a stale snapshot.
    const dataRef = useRef(data);
    dataRef.current = data;

    const userId = (session?.user as PBAuthModel | null)?.id || '';

    const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
        if (!userId) {
            setLoading(false);
            return;
        }

        if (!opts?.silent) setLoading(true);
        setError(null);

        try {
            const [
                contacts, deals, projects, tasks, invoices,
                timeEntries, expenses, recentActivity, notes, importBatches, profiles, shares,
            ] = await Promise.all([
                api.contacts.fetch(userId),
                api.deals.fetch(userId),
                api.projects.fetch(userId),
                api.tasks.fetch(userId),
                api.invoices.fetch(userId),
                api.timeEntries.fetch(userId),
                api.expenses.fetch(userId),
                api.recentActivity.fetch(userId),
                api.notes.fetch(userId),
                api.importBatches.fetch(userId),
                // A server that hasn't run the v1.1 migrations yet has no
                // business_profiles collection; carry on with defaults.
                api.businessProfiles.fetch(userId).catch(() => []),
                api.invoiceShares.fetch(userId).catch(() => []),
            ]);

            setData(prev => ({
                ...prev,
                contacts: contacts as unknown as Contact[],
                deals: deals as unknown as Deal[],
                projects: projects as unknown as Project[],
                tasks: tasks as unknown as Task[],
                invoices: invoices as unknown as Invoice[],
                timeEntries: timeEntries as unknown as TimeEntry[],
                expenses: expenses as unknown as Expense[],
                recentActivity: recentActivity as unknown as RecentActivity[],
                notes: notes as unknown as Note[],
                importBatches: importBatches as unknown as ImportBatch[],
                invoiceShares: shares as unknown as InvoiceShare[],
                businessProfile: profiles[0]
                    ? { ...defaultBusinessProfile, ...(profiles[0] as unknown as BusinessProfile) }
                    : defaultBusinessProfile,
            }));
        } catch (err: unknown) {
            setError((err as Error).message || 'Could not load your data.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Pick up changes made in another tab or device when the window regains
    // focus, at most once a minute.
    useEffect(() => {
        let last = Date.now();
        const onFocus = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - last < 60_000) return;
            last = Date.now();
            fetchData({ silent: true });
        };
        document.addEventListener('visibilitychange', onFocus);
        window.addEventListener('focus', onFocus);
        return () => {
            document.removeEventListener('visibilitychange', onFocus);
            window.removeEventListener('focus', onFocus);
        };
    }, [fetchData]);

    // Live updates: changes made in another tab, device or by the server
    // (recurring invoices) appear without a reload. Our own writes echo back
    // too; upserting by id makes that a no-op. The subscription obeys the same
    // owner-only rules as every read.
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const unsubs: (() => Promise<void>)[] = [];
        // Events are queued and applied together, so a bulk import (hundreds of
        // creates) re-renders a handful of times instead of once per record.
        let queue: { key: ListKey; action: string; rec: { id: string } }[] = [];
        let timer: number | undefined;
        const flush = () => {
            timer = undefined;
            const batch = queue;
            queue = [];
            setData(prev => {
                const next = { ...prev };
                for (const { key, action, rec } of batch) {
                    const list = next[key] as unknown as { id?: string }[];
                    if (action === 'delete') {
                        (next as Record<string, unknown>)[key] = list.filter(i => i.id !== rec.id);
                        continue;
                    }
                    const idx = list.findIndex(i => i.id === rec.id);
                    if (idx === -1) {
                        (next as Record<string, unknown>)[key] = [rec, ...list];
                    } else {
                        const copy = [...list];
                        copy[idx] = { ...copy[idx], ...rec };
                        (next as Record<string, unknown>)[key] = copy;
                    }
                }
                return next;
            });
        };
        const apply = (key: ListKey, action: string, raw: Record<string, unknown>) => {
            const collection = key === 'contacts' ? 'contacts' : key === 'invoices' ? 'invoices' : '';
            const rec = api.fromServer(collection, raw as never) as unknown as { id: string };
            queue.push({ key, action, rec });
            if (timer === undefined) timer = window.setTimeout(flush, 120);
        };
        (async () => {
            for (const [collection, key] of REALTIME) {
                try {
                    const unsub = await pb.collection(collection).subscribe('*', (e) => apply(key, e.action, e.record as unknown as Record<string, unknown>));
                    if (cancelled) unsub(); else unsubs.push(unsub);
                } catch {
                    // Realtime is a nicety; the app works without it.
                }
            }
        })();
        return () => {
            cancelled = true;
            if (timer !== undefined) window.clearTimeout(timer);
            unsubs.forEach(u => u().catch(() => undefined));
        };
    }, [userId]);

    // Sync userProfile with session user data on login/signup
    useEffect(() => {
        if (session?.user) {
            setData(prev => ({
                ...prev,
                userProfile: {
                    name: session.user.name || '',
                    email: session.user.email || '',
                }
            }));
        }
    }, [session]);

    const resync = useCallback(async (e: unknown): Promise<never> => {
        // After a partial failure, trust the server rather than local state.
        await fetchData({ silent: true });
        throw e;
    }, [fetchData]);

    const makeHandlers = useCallback(<T extends { id?: string }>(key: ListKey, binding: Binding) => {
        const add = async (item: Creatable<T>): Promise<T> => {
            if (!userId) throw new Error('User not authenticated');
            const rec = await binding.create({ ...(item as Record<string, unknown>), user: userId }) as T;
            // Upsert: the realtime echo of this create may already have landed.
            setData(prev => ({ ...prev, [key]: [rec, ...(prev[key] as unknown as T[]).filter(i => i.id !== rec.id)] }));
            return rec;
        };

        const update = async (item: WithId<T>): Promise<T> => {
            if (!userId) throw new Error('User not authenticated');
            const { id, ...changes } = item as Record<string, unknown> & { id: string };
            const rec = await binding.update(id, changes) as T;
            setData(prev => ({
                ...prev,
                [key]: (prev[key] as unknown as T[]).map(i => (i.id === id ? { ...i, ...rec } : i)),
            }));
            return rec;
        };

        const del = async (id: string): Promise<void> => {
            if (!userId) throw new Error('User not authenticated');
            await binding.remove(id);
            setData(prev => ({ ...prev, [key]: (prev[key] as unknown as T[]).filter(i => i.id !== id) }));
        };

        return { add, update, del };
    }, [userId]);

    const contactsApi = useMemo(() => makeHandlers<Contact>('contacts', api.contacts), [makeHandlers]);
    const dealsApi = useMemo(() => makeHandlers<Deal>('deals', api.deals), [makeHandlers]);
    const projectsApi = useMemo(() => makeHandlers<Project>('projects', api.projects), [makeHandlers]);
    const tasksApi = useMemo(() => makeHandlers<Task>('tasks', api.tasks), [makeHandlers]);
    const invoicesApi = useMemo(() => makeHandlers<Invoice>('invoices', api.invoices), [makeHandlers]);
    const timeEntriesApi = useMemo(() => makeHandlers<TimeEntry>('timeEntries', api.timeEntries), [makeHandlers]);
    const expensesApi = useMemo(() => makeHandlers<Expense>('expenses', api.expenses), [makeHandlers]);
    const notesApi = useMemo(() => makeHandlers<Note>('notes', api.notes), [makeHandlers]);

    const addRecentActivity = useCallback<DataContextType['addRecentActivity']>(async (activity) => {
        if (!userId) return;
        try {
            const rec = await api.recentActivity.create({
                ...activity,
                timestamp: activity.timestamp || new Date().toISOString(),
                user: userId,
            }) as unknown as RecentActivity;
            setData(prev => ({ ...prev, recentActivity: [rec, ...prev.recentActivity.filter(a => a.id !== rec.id)] }));
        } catch (e) {
            console.error('Failed to log activity:', e);
        }
    }, [userId]);

    const addMultipleContacts = useCallback(async (contactsToAdd: Creatable<Contact>[], batchDetails: Creatable<ImportBatch>) => {
        if (!userId) throw new Error('User not authenticated');

        const newBatch = await api.importBatches.create({ ...batchDetails, user: userId }) as unknown as ImportBatch;

        const rows = contactsToAdd.map(c => ({
            ...c,
            user: userId,
            import_batch_id: newBatch.id,
        }));

        let newContacts: Contact[];
        try {
            newContacts = await api.createContactsBulk(rows) as unknown as Contact[];
        } catch (e) {
            return resync(e);
        }

        setData(prev => ({
            ...prev,
            contacts: [...newContacts, ...prev.contacts.filter(c => !newContacts.some(n => n.id === c.id))],
            importBatches: [newBatch, ...prev.importBatches.filter(b => b.id !== newBatch.id)],
        }));
    }, [userId, resync]);

    // Delete a set of projects and everything hanging off them. Expenses are
    // financial records, so they are unlinked from the project rather than
    // deleted.
    const cascadeProjects = useCallback(async (projectIds: Set<string>) => {
        const d = dataRef.current;
        await Promise.all([
            ...d.tasks.filter(t => t.id && projectIds.has(t.project_id)).map(t => api.tasks.remove(t.id!)),
            ...d.timeEntries.filter(te => te.id && projectIds.has(te.project_id)).map(te => api.timeEntries.remove(te.id!)),
            ...d.expenses.filter(ex => ex.id && ex.project_id && projectIds.has(ex.project_id)).map(ex =>
                api.expenses.update(ex.id!, { project_id: '' }).catch(e => { if (!api.isNotFound(e)) throw e; })),
        ]);
        await Promise.all([...projectIds].map(id => api.projects.remove(id)));
    }, []);

    const applyProjectCascade = (prev: AppState, projectIds: Set<string>): AppState => ({
        ...prev,
        projects: prev.projects.filter(p => !projectIds.has(p.id!)),
        tasks: prev.tasks.filter(t => !projectIds.has(t.project_id)),
        timeEntries: prev.timeEntries.filter(te => !projectIds.has(te.project_id)),
        expenses: prev.expenses.map(ex => (ex.project_id && projectIds.has(ex.project_id) ? { ...ex, project_id: '' } : ex)),
    });

    const deleteProject = useCallback(async (id: string) => {
        const ids = new Set([id]);
        try {
            await cascadeProjects(ids);
        } catch (e) {
            return resync(e);
        }
        setData(prev => applyProjectCascade(prev, ids));
    }, [cascadeProjects, resync]);

    const deleteContacts = useCallback(async (contactIds: Set<string>) => {
        const d = dataRef.current;
        const projectIds = new Set(d.projects.filter(p => p.id && contactIds.has(p.client_id)).map(p => p.id!));
        try {
            await cascadeProjects(projectIds);
            await Promise.all([
                ...d.deals.filter(x => x.id && contactIds.has(x.contact_id)).map(x => api.deals.remove(x.id!)),
                ...d.invoices.filter(x => x.id && contactIds.has(x.client_id)).map(x => api.invoices.remove(x.id!)),
                ...d.invoiceShares.filter(sh => d.invoices.some(i => i.id === sh.invoice_id && contactIds.has(i.client_id))).map(sh => api.invoiceShares.remove(sh.id)),
                ...d.notes.filter(x => x.id && contactIds.has(x.contact_id)).map(x => api.notes.remove(x.id!)),
            ]);
            await Promise.all([...contactIds].map(id => api.contacts.remove(id)));
        } catch (e) {
            return resync(e);
        }
        setData(prev => {
            const next = applyProjectCascade(prev, projectIds);
            return {
                ...next,
                contacts: next.contacts.filter(c => !contactIds.has(c.id!)),
                deals: next.deals.filter(x => !contactIds.has(x.contact_id)),
                invoices: next.invoices.filter(x => !contactIds.has(x.client_id)),
                invoiceShares: next.invoiceShares.filter(sh => next.invoices.some(i => i.id === sh.invoice_id && !contactIds.has(i.client_id))),
                notes: next.notes.filter(x => !contactIds.has(x.contact_id)),
            };
        });
    }, [cascadeProjects, resync]);

    const deleteContact = useCallback((id: string) => deleteContacts(new Set([id])), [deleteContacts]);

    const undoImport = useCallback(async (batchId: string) => {
        if (!userId) throw new Error('User not authenticated');
        const ids = new Set(dataRef.current.contacts.filter(c => c.import_batch_id === batchId && c.id).map(c => c.id!));
        await deleteContacts(ids);
        try {
            await api.importBatches.remove(batchId);
        } catch (e) {
            return resync(e);
        }
        setData(prev => ({ ...prev, importBatches: prev.importBatches.filter(b => b.id !== batchId) }));
    }, [userId, deleteContacts, resync]);

    const deleteInvoice = useCallback(async (id: string) => {
        // Free up any time that was billed on this invoice so it can be billed again.
        const billed = dataRef.current.timeEntries.filter(te => te.invoice_id === id && te.id);
        try {
            await Promise.all(billed.map(te => api.timeEntries.update(te.id!, { invoice_id: '' })));
            const share = dataRef.current.invoiceShares.find(sh => sh.invoice_id === id);
            if (share) await api.invoiceShares.remove(share.id);
            await api.invoices.remove(id);
        } catch (e) {
            return resync(e);
        }
        setData(prev => ({
            ...prev,
            invoices: prev.invoices.filter(i => i.id !== id),
            invoiceShares: prev.invoiceShares.filter(sh => sh.invoice_id !== id),
            timeEntries: prev.timeEntries.map(te => (te.invoice_id === id ? { ...te, invoice_id: '' } : te)),
        }));
    }, [resync]);

    const saveBusinessProfile = useCallback(async (profile: Partial<BusinessProfile>) => {
        if (!userId) throw new Error('User not authenticated');
        const existing = dataRef.current.businessProfile;
        const { id: _id, user: _u, created: _c, updated: _up, ...changes } = profile;
        const rec = existing.id
            ? await api.businessProfiles.update(existing.id, changes)
            : await api.businessProfiles.create({ ...defaultBusinessProfile, ...changes, user: userId });
        const merged = { ...defaultBusinessProfile, ...(rec as unknown as BusinessProfile) };
        setData(prev => ({ ...prev, businessProfile: merged }));
        return merged;
    }, [userId]);

    const shareInvoice = useCallback(async (invoiceId: string) => {
        if (!userId) throw new Error('User not authenticated');
        const d = dataRef.current;
        const invoice = d.invoices.find(i => i.id === invoiceId);
        if (!invoice) throw new Error('Invoice not found');
        const snapshot = buildShareSnapshot(invoice, d.contacts.find(c => c.id === invoice.client_id), d.businessProfile, d.userProfile);
        const existing = d.invoiceShares.find(s => s.invoice_id === invoiceId);
        const rec = (existing
            ? await api.invoiceShares.update(existing.id, { snapshot })
            : await api.invoiceShares.create({ invoice_id: invoiceId, token: newShareToken(), snapshot, user: userId })) as unknown as InvoiceShare;
        setData(prev => ({ ...prev, invoiceShares: [rec, ...prev.invoiceShares.filter(s => s.id !== rec.id)] }));
        return rec;
    }, [userId]);

    const revokeShare = useCallback(async (invoiceId: string) => {
        const existing = dataRef.current.invoiceShares.find(s => s.invoice_id === invoiceId);
        if (!existing) return;
        await api.invoiceShares.remove(existing.id);
        setData(prev => ({ ...prev, invoiceShares: prev.invoiceShares.filter(s => s.id !== existing.id) }));
    }, []);

    // Keep a shared link showing the current invoice after every edit.
    const updateInvoice = useCallback(async (item: WithId<Invoice>) => {
        const rec = await invoicesApi.update(item);
        if (dataRef.current.invoiceShares.some(s => s.invoice_id === item.id)) {
            // dataRef updates on the next render; merge the change in by hand.
            const merged = { ...dataRef.current.invoices.find(i => i.id === item.id)!, ...rec };
            dataRef.current = { ...dataRef.current, invoices: dataRef.current.invoices.map(i => (i.id === item.id ? merged : i)) };
            shareInvoice(item.id).catch(e => console.error('Could not refresh shared invoice:', e));
        }
        return rec;
    }, [invoicesApi, shareInvoice]);

    const loadSampleData = useCallback(async () => {
        if (!userId) throw new Error('User not authenticated');
        await restoreBackup(buildSampleBackup(), userId, { hasBusinessProfile: true });
        await fetchData({ silent: true });
    }, [userId, fetchData]);

    const removeSampleData = useCallback(async () => {
        const d = dataRef.current;
        const ids = new Set(d.contacts.filter(c => c.tags?.includes(SAMPLE_TAG) && c.id).map(c => c.id!));
        const projectIds = new Set(d.projects.filter(p => p.id && ids.has(p.client_id)).map(p => p.id!));
        // Sample expenses are either on sample projects or marked in the description.
        const expenses = d.expenses.filter(ex => ex.id && ((ex.project_id && projectIds.has(ex.project_id)) || ex.description.endsWith('(sample)')));
        try {
            await Promise.all(expenses.map(ex => api.expenses.remove(ex.id!)));
            // Drop them locally now, so the contact cascade below doesn't try
            // to unlink expenses that no longer exist.
            const gone = new Set(expenses.map(ex => ex.id));
            dataRef.current = { ...dataRef.current, expenses: dataRef.current.expenses.filter(ex => !gone.has(ex.id)) };
            setData(prev => ({ ...prev, expenses: prev.expenses.filter(ex => !gone.has(ex.id)) }));
            await deleteContacts(ids);
        } finally {
            await fetchData({ silent: true });
        }
    }, [deleteContacts, fetchData]);

    const updateUserProfile = useCallback(async (profile: Partial<UserProfile>) => {
        if (!session?.user?.id) return;
        await pb.collection('users').update(session.user.id, { name: profile.name });
        setData(prev => ({ ...prev, userProfile: { ...prev.userProfile, name: profile.name ?? prev.userProfile.name } }));
    }, [session]);

    const refresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

    const value: DataContextType = useMemo(() => ({
        data,
        loading,
        error,
        refresh,
        addContact: contactsApi.add,
        addMultipleContacts,
        updateContact: contactsApi.update,
        deleteContact,
        addDeal: dealsApi.add,
        updateDeal: dealsApi.update,
        deleteDeal: dealsApi.del,
        addProject: projectsApi.add,
        updateProject: projectsApi.update,
        deleteProject,
        addTask: tasksApi.add,
        updateTask: tasksApi.update,
        deleteTask: tasksApi.del,
        addInvoice: invoicesApi.add,
        updateInvoice,
        deleteInvoice,
        addTimeEntry: timeEntriesApi.add,
        updateTimeEntry: timeEntriesApi.update,
        deleteTimeEntry: timeEntriesApi.del,
        addExpense: expensesApi.add,
        updateExpense: expensesApi.update,
        deleteExpense: expensesApi.del,
        addNote: notesApi.add,
        updateNote: notesApi.update,
        deleteNote: notesApi.del,
        addRecentActivity,
        undoImport,
        saveBusinessProfile,
        shareInvoice,
        revokeShare,
        loadSampleData,
        removeSampleData,
        updateUserProfile,
    }), [
        data, loading, error, refresh,
        contactsApi, dealsApi, projectsApi, tasksApi, invoicesApi, timeEntriesApi, expensesApi, notesApi,
        addMultipleContacts, deleteContact, deleteProject, deleteInvoice, addRecentActivity, undoImport,
        saveBusinessProfile, updateUserProfile, shareInvoice, revokeShare, updateInvoice, loadSampleData, removeSampleData,
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// Convenience: the user's currency, used by every money display.
export const useCurrency = () => useData().data.businessProfile.currency || DEFAULT_CURRENCY;
