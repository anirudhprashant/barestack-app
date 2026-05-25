import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
    addRecentActivity: (activity: Omit<RecentActivity, 'id' | 'user_id'>) => Promise<void>;
    addNote: (note: Creatable<Note>) => Promise<Note>;
    undoImport: (batchId: string) => Promise<void>;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
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

    const createApiHandler = useCallback(<T extends { id?: string }>(table: string, stateKey: keyof AppState, createFn: (data: Partial<Record<string, unknown>>) => Promise<unknown>, updateFn: (id: string, data: Partial<Record<string, unknown>>) => Promise<unknown>, deleteFn: (id: string) => Promise<void>) => {
        const add = async (item: Omit<T, 'id' | 'user_id' | 'created'>): Promise<T> => {
            if (!userId) throw new Error("User not authenticated");
            const itemWithUser = { ...item, user: userId };
            const newData = await createFn(itemWithUser) as Record<string, unknown>;
            const newRecord = pbRecord<T>(newData);
            setData(prev => ({ ...prev, [stateKey]: [newRecord, ...(prev[stateKey] as unknown as any[])] }));
            return newRecord;
        };

        const update = async (item: T): Promise<void> => {
            if (!userId) throw new Error("User not authenticated");
            const { id, ...updateData } = item as any;
            // @ts-ignore
            delete updateData.user_id;
            // @ts-ignore
            delete updateData.created;
            // @ts-ignore
            delete updateData.updated;
            await updateFn(id, updateData);
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

    const contactsApi = createApiHandler<Contact>(
        'contacts', 'contacts',
        (d) => api.createContact(d),
        (id, d) => api.updateContact(id, d),
        (id) => api.deleteContact(id)
    );
    const dealsApi = createApiHandler<Deal>(
        'deals', 'deals',
        (d) => api.createDeal(d),
        (id, d) => api.updateDeal(id, d),
        (id) => api.deleteDeal(id)
    );
    const projectsApi = createApiHandler<Project>(
        'projects', 'projects',
        (d) => api.createProject(d),
        (id, d) => api.updateProject(id, d),
        (id) => api.deleteProject(id)
    );
    const tasksApi = createApiHandler<Task>(
        'tasks', 'tasks',
        (d) => api.createTask(d),
        (id, d) => api.updateTask(id, d),
        (id) => api.deleteTask(id)
    );
    const invoicesApi = createApiHandler<Invoice>(
        'invoices', 'invoices',
        (d) => api.createInvoice(d),
        (id, d) => api.updateInvoice(id, d),
        (id) => api.deleteInvoice(id)
    );
    const timeEntriesApi = createApiHandler<TimeEntry>(
        'time_entries', 'timeEntries',
        (d) => api.createTimeEntry(d),
        (id, d) => api.updateTimeEntry(id, d as any),
        (id) => api.deleteTimeEntry(id)
    );
    const expensesApi = createApiHandler<Expense>(
        'expenses', 'expenses',
        (d) => api.createExpense(d),
        (id, d) => api.updateExpense(id, d as any),
        (id) => api.deleteExpense(id)
    );
    const notesApi = createApiHandler<Note>(
        'notes', 'notes',
        (d) => api.createNote(d),
        (id, d) => api.updateNote(id, d as any),
        (id) => api.deleteNote(id)
    );

    const addRecentActivity = async (activity: Omit<RecentActivity, 'id' | 'user_id'>) => {
        if (!userId) throw new Error("User not authenticated");
        const itemWithUser = { ...activity, user: userId };
        const newData = await api.createRecentActivity(itemWithUser) as Record<string, unknown>;
        setData(prev => ({ ...prev, recentActivity: [newData as unknown as RecentActivity, ...prev.recentActivity] }));
    };

    const addMultipleContacts = async (contactsToAdd: Creatable<Contact>[], batchDetails: Creatable<ImportBatch>) => {
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
    };

    const undoImport = async (batchId: string) => {
        if (!userId) throw new Error("User not authenticated");

        // Determine contacts to delete from local state
        const contactsToDelete = data.contacts.filter(c => c.import_batch_id === batchId);
        const contactIdsToDelete = new Set(contactsToDelete.map(c => c.id!));

        // 1. Delete contacts associated with the batch
        for (const c of contactsToDelete) {
            if (c.id) await api.deleteContact(c.id);
        }

        // 2. Delete the batch record itself
        await api.deleteImportBatch(batchId);

        // 3. Update local state completely
        setData(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.import_batch_id !== batchId),
            importBatches: prev.importBatches.filter(b => b.id !== batchId),
            deals: prev.deals.filter(d => d.contact_id && !contactIdsToDelete.has(d.contact_id)),
            projects: prev.projects.filter(p => p.client_id && !contactIdsToDelete.has(p.client_id)),
            invoices: prev.invoices.filter(i => i.client_id && !contactIdsToDelete.has(i.client_id)),
            notes: prev.notes.filter(n => n.contact_id && !contactIdsToDelete.has(n.contact_id)),
        }));
    };

    const deleteContact = async (id: string) => {
        await contactsApi.del(id);

        // Determine affected projects for this contact
        const affectedProjectIds = data.projects.filter(p => p.client_id === id).map(p => p.id!).filter(Boolean);

        try {
            // Best-effort cleanup of related records
            for (const pid of affectedProjectIds) {
                const tasks = data.tasks.filter(t => t.project_id === pid);
                const timeEntries = data.timeEntries.filter(te => te.project_id === pid);
                const expenses = data.expenses.filter(ex => ex.project_id === pid);
                for (const t of tasks) { if (t.id) await api.deleteTask(t.id); }
                for (const te of timeEntries) { if (te.id) await api.deleteTimeEntry(te.id as string); }
                for (const ex of expenses) { if (ex.id) await api.deleteExpense(ex.id); }
            }
        } catch (e) {
            // Best-effort; UI state will still be consistent below
        }

        // Update local state to remove all associated entities
        setData(prev => ({
            ...prev,
            deals: prev.deals.filter(d => d.contact_id !== id),
            projects: prev.projects.filter(p => p.client_id !== id),
            invoices: prev.invoices.filter(i => i.client_id !== id),
            notes: prev.notes.filter(n => n.contact_id !== id),
            tasks: prev.tasks.filter(t => !affectedProjectIds.includes(t.project_id)),
            timeEntries: prev.timeEntries.filter(te => !affectedProjectIds.includes(te.project_id)),
            expenses: prev.expenses.filter(ex => ex.project_id && !affectedProjectIds.includes(ex.project_id)),
        }));
    };

    const value: DataContextType = {
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
        updateUserProfile: async (profile: Partial<UserProfile>) => {
            setData(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...profile } }));
            // Also persist to PocketBase user record
            if (session?.user?.id) {
                try {
                    await pb.collection('users').update(session.user.id, { name: profile.name, email: profile.email });
                } catch (err) {
                    console.error('Failed to update PocketBase user:', err);
                }
            }
        },
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
