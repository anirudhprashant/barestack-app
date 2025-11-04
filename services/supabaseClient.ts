import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'https://your-project-ref.supabase.co';
const supabaseAnonKey = 'REDACTED';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);