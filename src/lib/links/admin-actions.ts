'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isLocale, type Locale } from '@/i18n/config';
import { requireAdmin } from '@/lib/auth/guards';
import type { LinkState } from './contracts';

export async function moderate(locale: Locale, _previous: LinkState, form: FormData): Promise<LinkState> {
  if (!isLocale(locale)) return { code: 'INVALID_INPUT' };
  const actor = await requireAdmin(locale);
  const input = z.object({ operation: z.enum(['link','account','report']), record_id: z.uuid(), enabled_value: z.enum(['true','false']), explanation: z.string().trim().min(3).max(500) }).safeParse(Object.fromEntries(form));
  if (!input.success) return { code: 'INVALID_INPUT' };
  const result = await actor.client.rpc('moderate_record', { ...input.data, enabled_value: input.data.enabled_value === 'true' });
  if (result.error) return { code: 'CONFLICT' };
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/discover`);
  return { code: 'SAVED' };
}
