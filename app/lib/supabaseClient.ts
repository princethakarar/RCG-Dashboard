import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anonymous public key)
// Safe to be exposed to the browser.
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
