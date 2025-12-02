import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';
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

export const DataProvider: React.FC<{ children: ReactNode; session: AuthSession | null }> = ({ children, session }) => {
    const [data, setData] = useState<AppState>(initialState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!session?.user) {
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
                supabase.from('contacts').select('*').eq('user_id', session.user.id),
                supabase.from('deals').select('*').eq('user_id', session.user.id),
                supabase.from('projects').select('*').eq('user_id', session.user.id),
                supabase.from('tasks').select('*').eq('user_id', session.user.id),
                supabase.from('invoices').select('*').eq('user_id', session.user.id),
                supabase.from('time_entries').select('*').eq('user_id', session.user.id),
                supabase.from('expenses').select('*').eq('user_id', session.user.id),
                supabase.from('recent_activity').select('*').eq('user_id', session.user.id).order('timestamp', { ascending: false }).limit(20),
                supabase.from('notes').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
                supabase.from('import_batches').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
            ]);

            const responses = [contacts, deals, projects, tasks, invoices, timeEntries, expenses, recentActivity, notes, importBatches];
            for (const res of responses) {
                if (res.error) throw res.error;
            }

            setData(prev => ({
                ...prev,
                contacts: contacts.data || [],
                deals: deals.data || [],
                projects: projects.data || [],
                tasks: tasks.data || [],
                invoices: invoices.data || [],
                timeEntries: timeEntries.data || [],
                expenses: expenses.data || [],
                recentActivity: recentActivity.data || [],
                notes: notes.data || [],
                importBatches: importBatches.data || [],
            }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const createApiHandler = useCallback(<T extends { id?: string }>(table: string, stateKey: keyof AppState) => {
        const add = async (item: Omit<T, 'id' | 'user_id' | 'created_at'>): Promise<T> => {
            if (!session?.user) throw new Error("User not authenticated");
            const itemWithUser = { ...item, user_id: session.user.id };
            const { data: newData, error } = await supabase.from(table).insert(itemWithUser).select().single();
            if (error) throw error;
            setData(prev => ({ ...prev, [stateKey]: [newData, ...(prev[stateKey] as any[])] }));
            return newData as T;
        };

        const update = async (item: T): Promise<void> => {
            if (!session?.user) throw new Error("User not authenticated");
            const { id, ...updateData } = item;
            // @ts-ignore
            delete updateData.user_id; // prevent user_id from being updated
            // @ts-ignore
            delete updateData.created_at; // prevent created_at from being updated
            const { error } = await supabase.from(table).update(updateData).eq('id', id);
            if (error) throw error;
            setData(prev => {
                const items = prev[stateKey] as unknown as T[];
                const index = items.findIndex(i => i.id === id);
                if (index > -1) {
                    const newItems = [...items];
                    newItems[index] = item;
                    return { ...prev, [stateKey]: newItems };
                }
                return prev;
            });
        };

        const del = async (id: string): Promise<void> => {
            if (!session?.user) throw new Error("User not authenticated");
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            setData(prev => ({ ...prev, [stateKey]: (prev[stateKey] as unknown as T[]).filter(item => item.id !== id) }));
        };

        return { add, update, del };
    }, [session]);

    const contactsApi = createApiHandler<Contact>('contacts', 'contacts');
    const dealsApi = createApiHandler<Deal>('deals', 'deals');
    const projectsApi = createApiHandler<Project>('projects', 'projects');
    const tasksApi = createApiHandler<Task>('tasks', 'tasks');
    const invoicesApi = createApiHandler<Invoice>('invoices', 'invoices');
    const timeEntriesApi = createApiHandler<TimeEntry>('time_entries', 'timeEntries');
    const expensesApi = createApiHandler<Expense>('expenses', 'expenses');
    const notesApi = createApiHandler<Note>('notes', 'notes');

    const addRecentActivity = async (activity: Omit<RecentActivity, 'id' | 'user_id'>) => {
        if (!session?.user) throw new Error("User not authenticated");
        const itemWithUser = { ...activity, user_id: session.user.id };
        const { data: newData, error } = await supabase.from('recent_activity').insert(itemWithUser).select().single();
        if (error) throw error;
        setData(prev => ({ ...prev, recentActivity: [newData, ...prev.recentActivity] }));
    };

    const addMultipleContacts = async (contacts: Creatable<Contact>[], batchDetails: Creatable<ImportBatch>) => {
        if (!session?.user) throw new Error("User not authenticated");

        // 1. Create the import batch record
        const batchWithUser = { ...batchDetails, user_id: session.user.id };
        const { data: newBatch, error: batchError } = await supabase.from('import_batches').insert(batchWithUser).select().single();
        if (batchError) throw batchError;

        // 2. Add batch ID and user ID to each contact
        const contactsToInsert = contacts.map(c => ({
            ...c,
            user_id: session.user.id,
            import_batch_id: newBatch.id,
        }));

        // 3. Bulk insert contacts
        const { data: newContacts, error: contactsError } = await supabase.from('contacts').insert(contactsToInsert).select();
        if (contactsError) throw contactsError;

        // 4. Update local state
        setData(prev => ({
            ...prev,
            contacts: [...newContacts, ...prev.contacts],
            importBatches: [newBatch, ...prev.importBatches],
        }));
    };

    const undoImport = async (batchId: string) => {
        if (!session?.user) throw new Error("User not authenticated");

        // It's crucial to update local state first to get the list of contacts to delete
        // and avoid race conditions.
        const contactsToDelete = data.contacts.filter(c => c.import_batch_id === batchId);
        const contactIdsToDelete = new Set(contactsToDelete.map(c => c.id!));

        // 1. Delete contacts associated with the batch
        const { error: contactsError } = await supabase.from('contacts').delete().eq('import_batch_id', batchId);
        if (contactsError) throw contactsError;

        // 2. Delete the batch record itself
        const { error: batchError } = await supabase.from('import_batches').delete().eq('id', batchId);
        if (batchError) throw batchError;

        // 3. Update local state completely, removing all associated data
        setData(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.import_batch_id !== batchId),
            importBatches: prev.importBatches.filter(b => b.id !== batchId),
            deals: prev.deals.filter(d => !contactIdsToDelete.has(d.contact_id)),
            projects: prev.projects.filter(p => !contactIdsToDelete.has(p.client_id)),
            invoices: prev.invoices.filter(i => !contactIdsToDelete.has(i.client_id)),
            notes: prev.notes.filter(n => !contactIdsToDelete.has(n.contact_id)),
        }));
    };

    const deleteContact = async (id: string) => {
        await contactsApi.del(id);

        // Determine affected projects for this contact
        const affectedProjectIds = data.projects.filter(p => p.client_id === id).map(p => p.id!).filter(Boolean);

        try {
            // Clean up related records in the database to avoid orphans
            if (affectedProjectIds.length > 0) {
                await supabase.from('tasks').delete().in('project_id', affectedProjectIds);
                await supabase.from('time_entries').delete().in('project_id', affectedProjectIds);
                await supabase.from('expenses').delete().in('project_id', affectedProjectIds);
            }
        } catch (e) {
            // Best-effort cleanup; UI state will still be consistent below
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
            expenses: prev.expenses.filter(ex => !affectedProjectIds.includes(ex.project_id || '')),
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
        addRecentActivity,
        addNote: notesApi.add,
        undoImport,
        updateUserProfile: (profile: Partial<UserProfile>) => setData(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...profile } })),
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
