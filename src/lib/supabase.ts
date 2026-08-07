import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Fail fast — surface misconfiguration immediately in development
if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
  throw new Error(
    '[Admin] VITE_SUPABASE_URL is not set or is a placeholder. ' +
    'Copy admin/.env.example to admin/.env.local and fill in your Supabase project URL.',
  )
}
if (!supabaseAnonKey || supabaseAnonKey === 'placeholder') {
  throw new Error(
    '[Admin] VITE_SUPABASE_ANON_KEY is not set or is a placeholder. ' +
    'Copy admin/.env.example to admin/.env.local and fill in your Supabase anon key.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
