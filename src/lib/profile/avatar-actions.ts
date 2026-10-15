'use server';

import { revalidatePath } from 'next/cache';
import { isLocale, type Locale } from '../../i18n/config';
import { requireActor } from '../auth/guards';
import { consumeAuthLimit } from '../auth/service';
import type { AuthState } from '../auth/contracts';
import { createAdminClient } from '../supabase/admin';
import { avatarMaxBytes, avatarPath, avatarType } from './avatar-validation';
import { logEvent } from '../logger';

export async function saveAvatar(locale: Locale, _previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const actor = await requireActor(locale);
  const file = form.get('avatar');
  if (!(file instanceof File) || file.size > avatarMaxBytes) return { code: 'INVALID_AVATAR' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = avatarType(bytes, file.type);
  if (!type) return { code: 'INVALID_AVATAR' };
  try {
    if (!await consumeAuthLimit('avatar', actor.user.id)) return { code: 'RATE_LIMITED' };
    const current = await actor.client.from('profiles').select('avatar_path').eq('id', actor.user.id).single();
    if (current.error) return { code: 'SERVICE_UNAVAILABLE' };
    const old = current.data.avatar_path as string | null;
    const path = `${actor.user.id}/${crypto.randomUUID()}.${type.extension}`;
    const admin = createAdminClient();
    const storage = admin.storage.from('avatars');
    if ((await storage.upload(path, bytes, { contentType: type.mime, upsert: false, cacheControl: '60' })).error) return { code: 'SERVICE_UNAVAILABLE' };
    let changed = false;
    try {
      const updated = await admin.rpc('replace_avatar', { owner_id: actor.user.id, previous_path: old, next_path: path });
      if (updated.error) return { code: 'SERVICE_UNAVAILABLE' };
      if (updated.data !== true) return { code: 'PROFILE_CONFLICT' };
      changed = true;
    } finally {
      const obsolete = changed ? old && avatarPath(old, actor.user.id) ? old : null : path;
      if (obsolete && (await storage.remove([obsolete])).error) logEvent({ event: 'avatar_cleanup_failed', requestId: crypto.randomUUID(), status: 502, durationMs: 0 });
    }
    revalidatePath(`/${locale}/settings`);
    return { code: 'AVATAR_SAVED' };
  } catch { return { code: 'SERVICE_UNAVAILABLE' }; }
}
