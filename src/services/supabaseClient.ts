import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ewysyrsfsuiaatmtrjko.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eXN5cnNmc3VpYWF0bXRyamtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTk5MjUsImV4cCI6MjA3NzEzNTkyNX0.5G2qWf_rngduMi4aumBzNTY8cKiustWfKqkw_bbOlPU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);