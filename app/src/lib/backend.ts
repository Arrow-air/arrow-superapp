// The shared Arrow Supabase, the same one flights.arrowair.com uses, so
// people sign in with the same accounts. Without its env vars the app runs
// as the in-browser demo.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const remote = !!(url && key);
// PKCE: a link back from GitHub or an email only signs in the browser that
// asked for it, so nobody can send a link that signs someone into another
// account (which flights and the forum would then share).
export const sb: SupabaseClient | null = remote ? createClient(url!, key!, { auth: { flowType: 'pkce' } }) : null;
