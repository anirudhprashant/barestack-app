import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Contact, Deal } from '../types';

export const api = {
    // Dashboard
    async getStats() {
        const [
            { count: total_contacts },
            { count: active_projects },
            { data: unpaid_invoices, error: unpaid_invoices_error },
            { data: time_entries, error: time_entries_error },
            { count: active_tasks }
        ] = await Promise.all([
            supabase.from('contacts').select('*', { count: 'exact', head: true }),
            supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('invoices').select('total_amount').eq('status', 'unpaid'),
            supabase.from('time_entries').select('hours').gte('date', startOfWeek(new Date()).toISOString()).lte('date', endOfWeek(new Date()).toISOString()),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'active')
        ]);

        if (unpaid_invoices_error) throw unpaid_invoices_error;
        if (time_entries_error) throw time_entries_error;

        const unpaid_invoices_total = unpaid_invoices?.reduce((sum, { total_amount }) => sum + total_amount, 0) || 0;
        const hours_this_week = time_entries?.reduce((sum, { hours }) => sum + hours, 0) || 0;

        return {
            total_contacts: total_contacts ?? 0,
            active_projects: active_projects ?? 0,
            unpaid_invoices_total,
            hours_this_week,
            active_tasks: active_tasks ?? 0,
        };
    },

    // Activity
    async getRecentActivity() {
        const { data, error } = await supabase
            .from('activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    },

    // CRM
    async getContacts(): Promise<Contact[]> {
        const { data, error } = await supabase.from('contacts').select('*');
        if (error) throw error;
        return data || [];
    },

    async createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
        const { data, error } = await supabase.from('contacts').insert(contact).select();
        if (error || !data || data.length === 0) throw error || new Error('Contact creation failed');
        return data[0];
    },

    async getDeals(): Promise<Deal[]> {
        const { data, error } = await supabase.from('deals').select('*');
        if (error) throw error;
        return data || [];
    },

    async createDeal(deal: Omit<Deal, 'id'>): Promise<Deal> {
        const { data, error } = await supabase.from('deals').insert(deal).select();
        if (error || !data || data.length === 0) throw error || new Error('Deal creation failed');
        return data[0];
    }
};
