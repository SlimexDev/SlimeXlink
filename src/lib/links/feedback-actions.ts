'use server';
import { headers, cookies } from 'next/headers';
import { z } from 'zod';
import { isLocale, type Locale } from '@/i18n/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteOrigin } from '@/lib/auth/service';
import { visitorCookie, visitorOptions, newVisitor, visitorDigest } from './visitor';
import { slugSchema, type LinkState } from './contracts';

export async function submitFeedback(kind: 'report' | 'contact', locale: Locale, _previous: LinkState, form: FormData): Promise<LinkState> {
  if (!isLocale(locale) || !['report', 'contact'].includes(kind)) return { code: 'INVALID_INPUT' };
  const head = await headers();
  if (head.get('origin') !== siteOrigin()) return { code: 'INVALID_INPUT' };
  const report = z.object({ slug: slugSchema, reason: z.enum(['scam', 'malware', 'copyright', 'other']), details: z.string().trim().min(10).max(2000) });
  const contact = z.object({ name: z.string().trim().min(1).max(80), email: z.email().max(254), message: z.string().trim().min(10).max(2000) });
  const input = (kind === 'report' ? report : contact).safeParse(Object.fromEntries(form));
  if (!input.success) return { code: 'INVALID_INPUT' };
  try {
    const jar = await cookies();
    let visitor = jar.get(visitorCookie)?.value;
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) { visitor = newVisitor(); jar.set(visitorCookie, visitor, visitorOptions); }
    const digest = visitorDigest(visitor, `feedback:${kind}`);
    const admin = createAdminClient();
    const limit = await admin.rpc('consume_auth_limit', { bucket_key: digest, max_attempts: 3, window_seconds: 900 });
    if (limit.error || !limit.data) return { code: 'RATE_LIMITED' };
    if (kind === 'report') {
      const data = report.parse(input.data);
      const link = await admin.from('links').select('id').eq('slug', data.slug).maybeSingle();
      if (link.error) return { code: 'UNAVAILABLE' };
      const saved = await admin.from('reports').insert({ ...data, link_id: link.data?.id ?? null, reporter_hash: digest });
      return { code: saved.error ? 'UNAVAILABLE' : 'REPORT_SENT' };
    }
    const saved = await admin.from('contact_messages').insert(contact.parse(input.data));
    return { code: saved.error ? 'UNAVAILABLE' : 'CONTACT_SENT' };
  } catch { return { code: 'UNAVAILABLE' }; }
}
