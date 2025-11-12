import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'https://ewysyrsfsuiaatmtrjko.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eXN5cnNmc3VpYWF0bXRyamtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTk5MjUsImV4cCI6MjA3NzEzNTkyNX0.5G2qWf_rngduMi4aumBzNTY8cKiustWfKqkw_bbOlPU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);