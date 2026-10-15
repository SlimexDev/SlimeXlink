'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '../../i18n/config';
import { loginSchema, resetPasswordSchema, type AuthState } from './contracts';
import { consumeAuthLimit, siteOrigin } from './service';
import { createServerSupabaseClient } from '../supabase/server';
import { requireActor } from './guards';
import { getRecoveryGrant } from './recovery';
import { recoveryCookie } from './recovery-token';
import { logEvent } from '../logger';

export async function requestRecovery(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const email = loginSchema.shape.email.safeParse(form.get('email'));
  if (!email.success) return { code: 'INVALID_INPUT' };
  try {
    if (!await consumeAuthLimit('recovery', email.data)) return { code: 'RATE_LIMITED' };
    const client = await createServerSupabaseClient(true);
    const started = performance.now();
    const { error } = await client.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteOrigin()}/auth/callback?locale=${locale}` });
    // Do not expose account existence through the provider's response.
    if (error) logEvent({ event: 'recovery_email_failed', requestId: crypto.randomUUID(), status: error.status ?? 502, durationMs: Math.round(performance.now() - started) });
    return { code: 'RECOVERY_REQUESTED' };
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
}

export async function resetPassword(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const input = resetPasswordSchema.safeParse({ password: form.get('password'), confirmPassword: form.get('confirmPassword') });
  if (!input.success) return { code: 'INVALID_INPUT' };
  const actor = await requireActor(locale);
  try {
    const grant = await getRecoveryGrant(actor.client, actor.user.id);
    if (!grant) return { code: 'RECOVERY_EXPIRED' };
    // Consume before the external Auth write: concurrent requests can never both change the password.
    if (!await consumeAuthLimit('recovery-use', grant.nonce)) return { code: 'RECOVERY_EXPIRED' };
    const client = await createServerSupabaseClient(true);
    const { error } = await client.auth.updateUser({ password: input.data.password });
    if (error) return { code: 'SERVICE_UNAVAILABLE' };
    const signedOut = await client.auth.signOut({ scope: 'global' });
    if (signedOut.error) return { code: 'SERVICE_UNAVAILABLE' };
    (await cookies()).delete(recoveryCookie);
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
  redirect(`/${locale}/login?notice=PASSWORD_CHANGED`);
}
