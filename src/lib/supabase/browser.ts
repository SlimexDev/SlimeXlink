import 'client-only';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '../env/public';

// Public data only. Authentication uses server actions and HttpOnly SSR cookies.
export function createPublicBrowserClient() {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error('SUPABASE_NOT_CONFIGURED');
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
