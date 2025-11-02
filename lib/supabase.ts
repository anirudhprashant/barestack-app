import { createClient } from '@supabase/supabase-js'

// Read Supabase URL and anon key from Vite env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl)) {
  console.error('Invalid VITE_SUPABASE_URL. Set it in .env.local to your Supabase API URL (e.g., https://your-project.supabase.co).')
  throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.')
}

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY. Set it in .env.local from Supabase Settings → API → anon public key.')
  throw new Error('Missing Supabase anon key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to ensure user is authenticated
export const ensureAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Sign in anonymously if no user
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.error('Error signing in anonymously:', error)
      throw error
    }
  }

  return user
}
