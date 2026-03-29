import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('supabase.ts must not be imported on the client')
  }
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_KEY!)
}
