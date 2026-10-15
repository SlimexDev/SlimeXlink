import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicSupabaseConfig } from '../env/public';

// In Server Components the Proxy owns refresh writes; actions must opt into cookie writes.
export async function createServerSupabaseClient(writeCookies = false) {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error('SUPABASE_NOT_CONFIGURED');
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => store.getAll(),
      ...(writeCookies ? { setAll: (values: { name: string; value: string; options: import('@supabase/ssr').CookieOptions }[]) => {
        values.forEach(({ name, value, options }) => store.set(name, value, options));
      } } : {}),
    },
  });
}
