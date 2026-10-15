'use server';

import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '../../i18n/config';
import { createServerSupabaseClient } from '../supabase/server';
import { loginSchema, signupSchema, profileSchema, safeReturnPath, type AuthState } from './contracts';
import { consumeAuthLimit, siteOrigin } from './service';
import { requireActor } from './guards';

export async function resendConfirmation(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const email = loginSchema.shape.email.safeParse(form.get('email'));
  if (!email.success) return { code: 'INVALID_INPUT' };
  try {
    if (!await consumeAuthLimit('confirmation', email.data)) return { code: 'RATE_LIMITED' };
    const client = await createServerSupabaseClient(true);
    // Provider responses can reveal whether an email exists; keep the public response uniform.
    await client.auth.resend({ type: 'signup', email: email.data, options: { emailRedirectTo: `${siteOrigin()}/auth/callback?locale=${locale}` } });
    return { code: 'CONFIRMATION_REQUESTED' };
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
}

export async function login(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const input = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!input.success) return { code: 'INVALID_INPUT' };
  try {
    if (!await consumeAuthLimit('login', input.data.email)) return { code: 'RATE_LIMITED' };
    const client = await createServerSupabaseClient(true);
    const { error } = await client.auth.signInWithPassword(input.data);
    if (error) return { code: error.code === 'email_not_confirmed' ? 'EMAIL_CONFIRMATION_REQUIRED' : 'INVALID_CREDENTIALS' };
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
  redirect(safeReturnPath(form.get('next'), locale));
}

export async function register(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const input = signupSchema.safeParse({ email: form.get('email'), password: form.get('password'), displayName: form.get('displayName') });
  if (!input.success) return { code: 'INVALID_INPUT' };
  try {
    if (!await consumeAuthLimit('signup', input.data.email)) return { code: 'RATE_LIMITED' };
    const client = await createServerSupabaseClient(true);
    const { error } = await client.auth.signUp({ email: input.data.email, password: input.data.password, options: { data: { display_name: input.data.displayName }, emailRedirectTo: `${siteOrigin()}/auth/callback?locale=${locale}` } });
    if (error) return { code: 'SERVICE_UNAVAILABLE' };
    return { code: 'EMAIL_SENT' };
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
}

export async function logout(locale: Locale) {
  if (!isLocale(locale)) return;
  const client = await createServerSupabaseClient(true);
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw new Error('SIGNOUT_UNAVAILABLE');
  redirect(`/${locale}/login`);
}

export async function saveProfile(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const input = profileSchema.safeParse({ displayName: form.get('displayName') });
  if (!input.success) return { code: 'INVALID_INPUT' };
  const actor = await requireActor(locale);
  try {
    if (!await consumeAuthLimit('profile', actor.user.id)) return { code: 'RATE_LIMITED' };
    const { data, error } = await actor.client.from('profiles').update({ display_name: input.data.displayName }).eq('id', actor.user.id).select('id').single();
    return error || !data ? { code: 'SERVICE_UNAVAILABLE' } : { code: 'PROFILE_SAVED' };
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
}

export async function googleLogin(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  if (process.env.AUTH_GOOGLE_ENABLED !== 'true') redirect(`/${locale}/login?error=PROVIDER_NOT_CONFIGURED`);
  let destination: string | undefined;
  try {
    if (!await consumeAuthLimit('google', 'public')) throw new Error('RATE_LIMITED');
    const client = await createServerSupabaseClient(true);
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${siteOrigin()}/auth/callback?locale=${locale}`, skipBrowserRedirect: true } });
    const providerUrl = data.url ? new URL(data.url) : null;
    if (error || !providerUrl || providerUrl.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin) throw new Error('INVALID_PROVIDER');
    destination = providerUrl.toString();
  } catch { redirect(`/${locale}/login?error=SERVICE_UNAVAILABLE`); }
  if (destination) redirect(destination);
}

