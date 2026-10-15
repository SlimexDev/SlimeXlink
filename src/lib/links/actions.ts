'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isLocale, type Locale } from '@/i18n/config';
import { requireActor } from '@/lib/auth/guards';
import { linkInputSchema, type LinkState } from './contracts';
import { avatarType, avatarMaxBytes } from '@/lib/profile/avatar-validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeAuthLimit } from '@/lib/auth/service';

export async function saveLink(locale: Locale, _previous: LinkState, form: FormData): Promise<LinkState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const actor = await requireActor(locale);
  let payload: unknown;
  try { payload = JSON.parse(String(form.get('payload'))); } catch { return { code: 'INVALID_INPUT' }; }
  const input = linkInputSchema.safeParse(payload);
  const id = form.get('id');
  const revision = Number(form.get('revision'));
  if (!input.success || (id && (!z.uuid().safeParse(id).success || !Number.isInteger(revision) || revision < 1))) return { code: 'INVALID_INPUT' };
  const image = form.get('image');
  let uploaded: string | undefined;
  if (image instanceof File && image.size > 0) {
    if (image.size > avatarMaxBytes) return { code: 'INVALID_IMAGE' };
    const bytes = new Uint8Array(await image.arrayBuffer());
    const type = avatarType(bytes, image.type);
    if (!type) return { code: 'INVALID_IMAGE' };
    if (!await consumeAuthLimit('link-image', actor.user.id)) return { code: 'RATE_LIMITED' };
    uploaded = `${actor.user.id}/${crypto.randomUUID()}.${type.extension}`;
    const result = await createAdminClient().storage.from('link-images').upload(uploaded, bytes, { contentType: type.mime, upsert: false });
    if (result.error) return { code: 'UNAVAILABLE' };
    input.data.imagePath = uploaded;
  }
  const result = await actor.client.rpc('save_link', { payload: input.data, record_id: id || null, expected_revision: id ? revision : null });
  if (result.error) {
    if (uploaded) await createAdminClient().storage.from('link-images').remove([uploaded]);
    return { code: result.error.code === '23505' ? 'SLUG_TAKEN' : result.error.message.includes('RATE_LIMITED') ? 'RATE_LIMITED' : 'CONFLICT' };
  }
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/links/${result.data}`);
  redirect(`/${locale}/dashboard/links/${result.data}`);
}

export async function deleteLink(locale: Locale, _previous: LinkState, form: FormData): Promise<LinkState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const actor = await requireActor(locale);
  const id = z.uuid().safeParse(form.get('id'));
  const revision = Number(form.get('revision'));
  if (!id.success || !Number.isInteger(revision) || revision < 1 || form.get('confirm') !== 'yes') return { code: 'INVALID_INPUT' };
  const result = await actor.client.rpc('delete_link', { record_id: id.data, expected_revision: revision });
  if (result.error || result.data !== true) return { code: 'CONFLICT' };
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard`);
}
