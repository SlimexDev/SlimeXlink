import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '../supabase/server';
import { accountAccess } from './contracts';
import type { Locale } from '../../i18n/config';

export async function requireActor(locale: Locale) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect(`/${locale}/login`);
  const access = await client.from('account_access').select('role,status').eq('user_id', data.user.id).single();
  if (access.error) throw new Error('ACCOUNT_ACCESS_UNAVAILABLE');
  const permission = accountAccess(access.data);
  if (!permission) redirect(`/${locale}/login?error=ACCOUNT_SUSPENDED`);
  if (!data.user.email_confirmed_at) redirect(`/${locale}/login?error=EMAIL_CONFIRMATION_REQUIRED`);
  return { client, user: data.user, role: permission.role };
}

export async function requireAdmin(locale: Locale) {
  const actor = await requireActor(locale);
  if (actor.role !== 'admin') redirect(`/${locale}/dashboard`);
  return actor;
}
