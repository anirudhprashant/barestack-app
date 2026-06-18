import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { pb } from './src/lib/pocketbase';
import * as api from './src/lib/api';
import type { PBAuthModel, PBSession } from './src/types/pb-types';
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
} from './types';

// --- DATA CONTEXT & PROVIDER ---
interface DataContextType {
    data: AppState;
    loading: boolean;
    error: string | null;
    addContact: (contact: Creatable<Contact>) => Promise<Contact>;
    addMultipleContacts: (contacts: Creatable<Contact>[], batchDetails: Creatable<ImportBatch>) => Promise<void>;
    updateContact: (contact: Contact) => Promise<void>;
    deleteContact: (id: string) => Promise<void>;
    addDeal: (deal: Creatable<Deal>) => Promise<Deal>;
    updateDeal: (deal: Deal) => Promise<void>;
    deleteDeal: (id: string) => Promise<void>;
    addProject: (project: Creatable<Project>) => Promise<Project>;
    updateProject: (project: Project) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    addTask: (task: Creatable<Task>) => Promise<Task>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    addInvoice: (invoice: Creatable<Invoice>) => Promise<Invoice>;
    updateInvoice: (invoice: Invoice) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    addTimeEntry: (timeEntry: Creatable<TimeEntry>) => Promise<TimeEntry>;
    addExpense: (expense: Creatable<Expense>) => Promise<Expense>;
    deleteExpense: (id: string) => Promise<void>;
    addRecentActivity: (activity: Omit<RecentActivity, 'id' | 'user_id'>) => Promise<void>;
    addNote: (note: Creatable<Note>) => Promise<Note>;
    undoImport: (batchId: string) => Promise<void>;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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
    userProfile: { name: 'User', email: 'user@example.com' },
};

export const DataProvider: React.FC<{ children: ReactNode; session: PBSession | null }> = ({ children, session }) => {
    const [data, setData] = useState<AppState>(initialState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = (session?.user as PBAuthModel | null)?.id || '';

    const fetchData = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [
                contacts, deals, projects, tasks, invoices,
                timeEntries, expenses, recentActivity, notes, importBatches
            ] = await Promise.all([
                api.fetchContacts(userId),
                api.fetchDeals(userId),
                api.fetchProjects(userId),
                api.fetchTasks(userId),
                api.fetchInvoices(userId),
                api.fetchTimeEntries(userId),
                api.fetchExpenses(userId),
                api.fetchRecentActivity(userId, 20),
                api.fetchNotes(userId),
                api.fetchImportBatches(userId),
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
            }));
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Sync userProfile with session user data on login/signup
    useEffect(() => {
        if (session?.user) {
            setData(prev => ({
                ...prev,
                userProfile: {
                    name: session.user.name || 'User',
                    email: session.user.email || '',
                }
            }));
        }
    }, [session]);

    // Helper to cast and shape PocketBase record to our types
    const pbRecord = <T extends object>(record: unknown): T => record as T;

    const createApiHandler = useCallback(<T extends { id?: string }>(stateKey: keyof AppState, createFn: (data: Partial<Record<string, unknown>>) => Promise<unknown>, updateFn: (id: string, data: Partial<Record<string, unknown>>) => Promise<unknown>, deleteFn: (id: string) => Promise<void>) => {
        const add = async (item: Creatable<T>): Promise<T> => {
            if (!userId) throw new Error("User not authenticated");
            const itemWithUser = { ...item, user: userId };
            const newData = await createFn(itemWithUser) as Record<string, unknown>;
            const newRecord = pbRecord<T>(newData);
            setData(prev => ({ ...prev, [stateKey]: [newRecord, ...(prev[stateKey] as unknown as any[])] }));
            return newRecord;
        };

        const update = async (item: T): Promise<void> => {
            if (!userId) throw new Error("User not authenticated");
            const { id, ...updateData } = item as Record<string, unknown>;
            // Strip server-managed fields PocketBase rejects on update.
            delete updateData.user_id;
            delete updateData.created;
            delete updateData.updated;
            await updateFn(id as string, updateData);
            setData(prev => {
                const items = prev[stateKey] as unknown as T[];
                const index = items.findIndex(i => (i as any).id === id);
                if (index > -1) {
                    const newItems = [...items];
                    newItems[index] = item;
                    return { ...prev, [stateKey]: newItems };
                }
                return prev;
            });
        };

        const del = async (id: string): Promise<void> => {
            if (!userId) throw new Error("User not authenticated");
            await deleteFn(id);
            setData(prev => ({ ...prev, [stateKey]: (prev[stateKey] as unknown as T[]).filter(item => (item as any).id !== id) }));
        };

        return { add, update, del };
    }, [userId]);

    // Handlers depend only on createApiHandler (stable per userId), so memoizing
    // here keeps their identities stable across renders and lets the context
    // value below stay referentially stable.
    const contactsApi = useMemo(() => createApiHandler<Contact>(
        'contacts',
        (d) => api.createContact(d),
        (id, d) => api.updateContact(id, d),
        (id) => api.deleteContact(id)
    ), [createApiHandler]);
    const dealsApi = useMemo(() => createApiHandler<Deal>(
        'deals',
        (d) => api.createDeal(d),
        (id, d) => api.updateDeal(id, d),
        (id) => api.deleteDeal(id)
    ), [createApiHandler]);
    const projectsApi = useMemo(() => createApiHandler<Project>(
        'projects',
        (d) => api.createProject(d),
        (id, d) => api.updateProject(id, d),
        (id) => api.deleteProject(id)
    ), [createApiHandler]);
    const tasksApi = useMemo(() => createApiHandler<Task>(
        'tasks',
        (d) => api.createTask(d),
        (id, d) => api.updateTask(id, d),
        (id) => api.deleteTask(id)
    ), [createApiHandler]);
    const invoicesApi = useMemo(() => createApiHandler<Invoice>(
        'invoices',
        (d) => api.createInvoice(d),
        (id, d) => api.updateInvoice(id, d),
        (id) => api.deleteInvoice(id)
    ), [createApiHandler]);
    const timeEntriesApi = useMemo(() => createApiHandler<TimeEntry>(
        'timeEntries',
        (d) => api.createTimeEntry(d),
        (id, d) => api.updateTimeEntry(id, d),
        (id) => api.deleteTimeEntry(id)
    ), [createApiHandler]);
    const expensesApi = useMemo(() => createApiHandler<Expense>(
        'expenses',
        (d) => api.createExpense(d),
        (id, d) => api.updateExpense(id, d),
        (id) => api.deleteExpense(id)
    ), [createApiHandler]);
    const notesApi = useMemo(() => createApiHandler<Note>(
        'notes',
        (d) => api.createNote(d),
        (id, d) => api.updateNote(id, d),
        (id) => api.deleteNote(id)
    ), [createApiHandler]);

    const addRecentActivity = useCallback(async (activity: Omit<RecentActivity, 'id' | 'user_id'>) => {
        if (!userId) throw new Error("User not authenticated");
        const itemWithUser = { ...activity, user: userId };
        const newData = await api.createRecentActivity(itemWithUser) as Record<string, unknown>;
        setData(prev => ({ ...prev, recentActivity: [newData as unknown as RecentActivity, ...prev.recentActivity] }));
    }, [userId]);

    const addMultipleContacts = useCallback(async (contactsToAdd: Creatable<Contact>[], batchDetails: Creatable<ImportBatch>) => {
        if (!userId) throw new Error("User not authenticated");

        // 1. Create the import batch record
        const batchWithUser = { ...batchDetails, user: userId };
        const newBatch = await api.createImportBatch(batchWithUser) as unknown as ImportBatch;

        // 2. Add batch ID and user ID to each contact
        const contactsToInsert = contactsToAdd.map(c => ({
            ...c,
            user: userId,
            import_batch_id: newBatch.id,
        }));

        // 3. Bulk insert contacts
        const newContacts = await api.createContactsBulk(contactsToInsert) as unknown as Contact[];

        // 4. Update local state
        setData(prev => ({
            ...prev,
            contacts: [...newContacts, ...prev.contacts],
            importBatches: [newBatch, ...prev.importBatches],
        }));
    }, [userId]);

    const undoImport = useCallback(async (batchId: string) => {
        if (!userId) throw new Error("User not authenticated");

        // Determine contacts to delete from local state
        const contactsToDelete = data.contacts.filter(c => c.import_batch_id === batchId);
        const contactIdsToDelete = new Set(contactsToDelete.map(c => c.id!).filter(Boolean));

        // Projects belonging to any of the deleted contacts, and their children.
        const affectedProjectIds = new Set(
            data.projects.filter(p => p.client_id && contactIdsToDelete.has(p.client_id)).map(p => p.id!).filter(Boolean)
        );

        // Delete server records, children first so no orphans survive on the backend.
        // Each entity type is deleted concurrently; types run in dependency order.
        try {
            await Promise.all([
                ...data.tasks.filter(t => affectedProjectIds.has(t.project_id) && t.id).map(t => api.deleteTask(t.id!)),
                ...data.timeEntries.filter(te => affectedProjectIds.has(te.project_id) && te.id).map(te => api.deleteTimeEntry(te.id!)),
                ...data.expenses.filter(ex => ex.project_id && affectedProjectIds.has(ex.project_id) && ex.id).map(ex => api.deleteExpense(ex.id!)),
            ]);
            await Promise.all([
                ...data.projects.filter(p => affectedProjectIds.has(p.id!)).map(p => api.deleteProject(p.id!)),
                ...data.deals.filter(d => d.contact_id && contactIdsToDelete.has(d.contact_id) && d.id).map(d => api.deleteDeal(d.id!)),
                ...data.invoices.filter(i => i.client_id && contactIdsToDelete.has(i.client_id) && i.id).map(i => api.deleteInvoice(i.id!)),
                ...data.notes.filter(n => n.contact_id && contactIdsToDelete.has(n.contact_id) && n.id).map(n => api.deleteNote(n.id!)),
            ]);
            await Promise.all(contactsToDelete.filter(c => c.id).map(c => api.deleteContact(c.id!)));
            await api.deleteImportBatch(batchId);
        } catch (e) {
            // Refetch to resync after a partial failure rather than trusting optimistic state.
            await fetchData();
            throw e;
        }

        // Update local state completely
        setData(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.import_batch_id !== batchId),
            importBatches: prev.importBatches.filter(b => b.id !== batchId),
            deals: prev.deals.filter(d => !(d.contact_id && contactIdsToDelete.has(d.contact_id))),
            projects: prev.projects.filter(p => !(p.client_id && contactIdsToDelete.has(p.client_id))),
            invoices: prev.invoices.filter(i => !(i.client_id && contactIdsToDelete.has(i.client_id))),
            notes: prev.notes.filter(n => !(n.contact_id && contactIdsToDelete.has(n.contact_id))),
            tasks: prev.tasks.filter(t => !affectedProjectIds.has(t.project_id)),
            timeEntries: prev.timeEntries.filter(te => !affectedProjectIds.has(te.project_id)),
            expenses: prev.expenses.filter(ex => !(ex.project_id && affectedProjectIds.has(ex.project_id))),
        }));
    }, [userId, data, fetchData]);

    const deleteContact = useCallback(async (id: string) => {
        // Determine affected projects for this contact
        const affectedProjectIds = new Set(
            data.projects.filter(p => p.client_id === id).map(p => p.id!).filter(Boolean)
        );

        // Delete children first (tasks/time/expenses), then projects + other
        // contact-owned records, then the contact itself. On any failure, resync
        // from the server so local state never diverges.
        try {
            await Promise.all([
                ...data.tasks.filter(t => affectedProjectIds.has(t.project_id) && t.id).map(t => api.deleteTask(t.id!)),
                ...data.timeEntries.filter(te => affectedProjectIds.has(te.project_id) && te.id).map(te => api.deleteTimeEntry(te.id!)),
                ...data.expenses.filter(ex => ex.project_id && affectedProjectIds.has(ex.project_id) && ex.id).map(ex => api.deleteExpense(ex.id!)),
            ]);
            await Promise.all([
                ...data.projects.filter(p => affectedProjectIds.has(p.id!)).map(p => api.deleteProject(p.id!)),
                ...data.deals.filter(d => d.contact_id === id && d.id).map(d => api.deleteDeal(d.id!)),
                ...data.invoices.filter(i => i.client_id === id && i.id).map(i => api.deleteInvoice(i.id!)),
                ...data.notes.filter(n => n.contact_id === id && n.id).map(n => api.deleteNote(n.id!)),
            ]);
            await api.deleteContact(id);
        } catch (e) {
            await fetchData();
            throw e;
        }

        // Update local state to remove all associated entities
        setData(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.id !== id),
            deals: prev.deals.filter(d => d.contact_id !== id),
            projects: prev.projects.filter(p => p.client_id !== id),
            invoices: prev.invoices.filter(i => i.client_id !== id),
            notes: prev.notes.filter(n => n.contact_id !== id),
            tasks: prev.tasks.filter(t => !affectedProjectIds.has(t.project_id)),
            timeEntries: prev.timeEntries.filter(te => !affectedProjectIds.has(te.project_id)),
            expenses: prev.expenses.filter(ex => !(ex.project_id && affectedProjectIds.has(ex.project_id))),
        }));
    }, [data, fetchData]);

    const updateUserProfile = useCallback(async (profile: Partial<UserProfile>) => {
        setData(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...profile } }));
        // Also persist to PocketBase user record
        if (session?.user?.id) {
            await pb.collection('users').update(session.user.id, { name: profile.name, email: profile.email });
        }
    }, [session]);

    const value: DataContextType = useMemo(() => ({
        data,
        loading,
        error,
        addContact: contactsApi.add,
        addMultipleContacts,
        updateContact: contactsApi.update,
        deleteContact: deleteContact,
        addDeal: dealsApi.add,
        updateDeal: dealsApi.update,
        deleteDeal: dealsApi.del,
        addProject: projectsApi.add,
        updateProject: projectsApi.update,
        deleteProject: projectsApi.del,
        addTask: tasksApi.add,
        updateTask: tasksApi.update,
        deleteTask: tasksApi.del,
        addInvoice: invoicesApi.add,
        updateInvoice: invoicesApi.update,
        deleteInvoice: invoicesApi.del,
        addTimeEntry: timeEntriesApi.add,
        addExpense: expensesApi.add,
        deleteExpense: expensesApi.del,
        addRecentActivity,
        addNote: notesApi.add,
        undoImport,
        updateUserProfile,
    }), [
        data, loading, error,
        contactsApi, dealsApi, projectsApi, tasksApi, invoicesApi, timeEntriesApi, expensesApi, notesApi,
        addMultipleContacts, deleteContact, addRecentActivity, undoImport, updateUserProfile,
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
