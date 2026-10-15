import 'server-only';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readRecoveryToken, recoveryCookie, recoveryIdentitySchema } from './recovery-token';

export async function getRecoveryGrant(client: SupabaseClient, userId: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET ?? '';
  const token = (await cookies()).get(recoveryCookie)?.value;
  if (!token) return null;
  const { data, error } = await client.auth.getClaims();
  if (error || data?.claims.sub !== userId) return null;
  const identity = recoveryIdentitySchema.safeParse({ userId, sessionId: data.claims.session_id });
  return identity.success ? readRecoveryToken(token, identity.data, secret) : null;
}
