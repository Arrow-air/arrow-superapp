// The shared Arrow Supabase, the same one flights.arrowair.com uses, so
// people sign in with the same accounts. Without its env vars the app runs
// as the in-browser demo.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const remote = !!(url && key);
export const sb: SupabaseClient | null = remote ? createClient(url!, key!) : null;
