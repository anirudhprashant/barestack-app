
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { AppState, Contact, Deal, Expense, Invoice, Project, RecentActivity, Task, TimeEntry } from './types';
import { supabase } from './services/supabaseClient';
import { useAuth } from './App';

// --- INITIAL STATE ---
const initialState: AppState = {
    contacts: [],
    deals: [],
    projects: [],
    tasks: [],
    invoices: [],
    timeEntries: [],
    expenses: [],
    recentActivity: [],
};

// --- CONTEXT ---
interface DataContextType {
    data: AppState;
    loading: boolean;
    error: string | null;
    addContact: (contact: Omit<Contact, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    addDeal: (deal: Omit<Deal, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    addInvoice: (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    addRecentActivity: (activity: Omit<RecentActivity, 'id' | 'user_id'>) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// --- PROVIDER ---
// FIX: Explicitly type DataProvider as React.FC to resolve a potential TypeScript inference issue causing a false positive 'children' prop error.
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const [data, setData] = useState<AppState>(initialState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!session) return;
        setLoading(true);
        setError(null);

        try {
            const [
                contacts, deals, projects, tasks, invoices, timeEntries, expenses, recentActivity
            ] = await Promise.all([
                supabase.from('contacts').select('*'),
                supabase.from('deals').select('*'),
                supabase.from('projects').select('*'),
                supabase.from('tasks').select('*'),
                supabase.from('invoices').select('*'),
                supabase.from('time_entries').select('*'),
                supabase.from('expenses').select('*'),
                supabase.from('recent_activity').select('*').order('timestamp', { ascending: false }).limit(20)
            ]);

            const checkError = (res: any, name: string) => {
                if (res.error) throw new Error(`Failed to fetch ${name}: ${res.error.message}`);
                return res.data;
            };

            setData({
                contacts: checkError(contacts, 'contacts'),
                deals: checkError(deals, 'deals'),
                projects: checkError(projects, 'projects'),
                tasks: checkError(tasks, 'tasks'),
                invoices: checkError(invoices, 'invoices'),
                timeEntries: checkError(timeEntries, 'time_entries'),
                expenses: checkError(expenses, 'expenses'),
                recentActivity: checkError(recentActivity, 'recent_activity'),
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

    const addContact = async (contact: Omit<Contact, 'id' | 'user_id' | 'created_at'>) => {
        const { error } = await supabase.from('contacts').insert(contact);
        if (error) setError(error.message);
        else await fetchData();
    };

    const addDeal = async (deal: Omit<Deal, 'id' | 'user_id' | 'created_at'>) => {
        const { error } = await supabase.from('deals').insert(deal);
        if (error) setError(error.message);
        else await fetchData();
    };
    
    const addProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at'>) => {
        const { error } = await supabase.from('projects').insert(project);
        if (error) setError(error.message);
        else await fetchData();
    };
    
    const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at'>) => {
        const { error } = await supabase.from('tasks').insert(task);
        if (error) setError(error.message);
        else await fetchData();
    };

    const addInvoice = async (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at'>) => {
        const { error } = await supabase.from('invoices').insert(invoice);
        if (error) setError(error.message);
        else await fetchData();
    };
    
    const addExpense = async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => {
        const { error } = await supabase.from('expenses').insert(expense);
        if (error) setError(error.message);
        else await fetchData();
    };

    const addRecentActivity = async (activity: Omit<RecentActivity, 'id' | 'user_id'>) => {
       await supabase.from('recent_activity').insert(activity);
       // We don't need to refetch for this, as it's not critical to show instantly.
       // The next full fetch will pick it up.
    };


    return (
        <DataContext.Provider value={{ data, loading, error, addContact, addDeal, addProject, addTask, addInvoice, addExpense, addRecentActivity }}>
            {children}
        </DataContext.Provider>
    );
};

// --- HOOK ---
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
