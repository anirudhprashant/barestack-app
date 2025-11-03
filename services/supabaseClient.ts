import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'https://your-project-ref.supabase.co';
const supabaseAnonKey = 'REDACTED';

if (!supabaseUrl || supabaseUrl === 'https://your-project-ref.supabase.co') {
    console.error("Supabase URL is not configured. Please add it to services/supabaseClient.ts");
}
if (!supabaseAnonKey || supabaseAnonKey === 'REDACTED') {
    console.error("Supabase anon key is not configured. Please add it to services/supabaseClient.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);