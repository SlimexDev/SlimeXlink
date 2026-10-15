import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getAdminConfig } from '../env/server';

// Call only after the caller has checked its own authorization. This bypasses RLS.
export function createAdminClient() {
  const { url, serviceRoleKey } = getAdminConfig();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
