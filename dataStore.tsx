import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './services/supabaseClient';
import { useAuth } from './App';
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
    Creatable,
} from './types';

interface DataContextType {
    data: AppState;
    loading: boolean;
    error: string | null;
    addContact: (contact: Creatable<Contact>) => Promise<void>;
    updateContact: (contact: Contact) => Promise<void>;
    deleteContact: (id: string) => Promise<void>;
    addDeal: (deal: Creatable<Deal>) => Promise<void>;
    updateDeal: (deal: Deal) => Promise<void>;
    deleteDeal: (id: string) => Promise<void>;
    addProject: (project: Creatable<Project>) => Promise<void>;
    updateProject: (project: Project) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    addTask: (task: Creatable<Task>) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    addInvoice: (invoice: Creatable<Invoice>) => Promise<void>;
    updateInvoice: (invoice: Invoice) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    addTimeEntry: (timeEntry: Creatable<TimeEntry>) => Promise<void>;
    addExpense: (expense: Creatable<Expense>) => Promise<void>;
    addRecentActivity: (activity: Omit<RecentActivity, 'id' | 'user_id'>) => Promise<void>;
    addNote: (note: Creatable<Note>) => Promise<void>;
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
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session } = useAuth();
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
                timeEntries, expenses, recentActivity, notes,
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
            ]);
            
            const responses = [contacts, deals, projects, tasks, invoices, timeEntries, expenses, recentActivity, notes];
            for (const res of responses) {
                if (res.error) throw res.error;
            }

            setData({
                contacts: contacts.data || [],
                deals: deals.data || [],
                projects: projects.data || [],
                tasks: tasks.data || [],
                invoices: invoices.data || [],
                timeEntries: timeEntries.data || [],
                expenses: expenses.data || [],
                recentActivity: recentActivity.data || [],
                notes: notes.data || [],
            });
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
        const add = async (item: Omit<T, 'id' | 'user_id' | 'created_at'>): Promise<void> => {
            if (!session?.user) throw new Error("User not authenticated");
            const itemWithUser = { ...item, user_id: session.user.id };
            const { data: newData, error } = await supabase.from(table).insert(itemWithUser).select().single();
            if (error) throw error;
            setData(prev => ({ ...prev, [stateKey]: [newData, ...(prev[stateKey] as any[])] }));
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
                const items = prev[stateKey] as T[];
                const index = items.findIndex(i => i.id === id);
                if (index > -1) items[index] = item;
                return { ...prev, [stateKey]: [...items] };
            });
        };

        const del = async (id: string): Promise<void> => {
            if (!session?.user) throw new Error("User not authenticated");
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            setData(prev => ({ ...prev, [stateKey]: (prev[stateKey] as T[]).filter(item => item.id !== id) }));
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

    const deleteContact = async (id: string) => {
        await contactsApi.del(id);
        // Also remove associated deals and notes from local state for immediate UI update
        setData(prev => ({
            ...prev,
            deals: prev.deals.filter(d => d.contact_id !== id),
            notes: prev.notes.filter(n => n.contact_id !== id),
        }));
    };

    const value: DataContextType = {
        data,
        loading,
        error,
        addContact: contactsApi.add,
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