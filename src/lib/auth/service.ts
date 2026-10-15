import 'server-only';
import { createAdminClient } from '../supabase/admin';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';

export function siteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error('SITE_URL_REQUIRED');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:' && process.env.VERCEL_ENV !== 'production')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('INVALID_SITE_URL');
  return url.origin;
}

export async function consumeAuthLimit(kind: 'login' | 'signup' | 'confirmation' | 'google' | 'profile' | 'avatar' | 'link-image' | 'recovery' | 'recovery-use', identity: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error('RATE_LIMIT_NOT_CONFIGURED');
  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');
  if (origin && origin !== siteOrigin()) throw new Error('INVALID_ORIGIN');
  const digest = createHmac('sha256', secret).update(`${kind}:${identity.toLowerCase()}`).digest('hex');
  const maxAttempts = kind === 'recovery-use' ? 1 : ['signup', 'confirmation', 'recovery'].includes(kind) ? 3 : 10;
  const { data, error } = await createAdminClient().rpc('consume_auth_limit', { bucket_key: digest, max_attempts: maxAttempts, window_seconds: 900 });
  if (error) throw new Error('RATE_LIMIT_UNAVAILABLE');
  return data === true;
}
