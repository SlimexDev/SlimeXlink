import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { isLocale } from '@/i18n/config';
import { requireActor } from '@/lib/auth/guards';
import { LinkEditor } from '@/components/link-editor';
import { linkRecordSchema, taskRecordSchema, type LinkInput } from '@/lib/links/contracts';

export default async function EditorPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ copy?: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const actor = await requireActor(locale);
  const { copy } = await searchParams;
  const source = id === 'new' ? copy : id;
  let initial: LinkInput | undefined;
  let revision: number | undefined;
  if (source) {
    if (!z.uuid().safeParse(source).success) notFound();
    const [link, target, tasks] = await Promise.all([
      actor.client.from('links').select('*').eq('id', source).eq('owner_id', actor.user.id).single(),
      actor.client.from('link_targets').select('url').eq('link_id', source).single(),
      actor.client.from('link_tasks').select('id,title,url,position,kind').eq('link_id', source).order('position'),
    ]);
    if (link.error || target.error || tasks.error) notFound();
    const record = linkRecordSchema.parse(link.data);
    initial = { title: record.title, description: record.description, slug: id === 'new' ? `copy-${crypto.randomUUID()}` : record.slug, destination: String(target.data.url), listed: record.listed, enabled: record.enabled, expiresAt: record.expires_at, imagePath: record.image_path, tasks: z.array(taskRecordSchema).parse(tasks.data).map(({ title, url }) => ({ title, url })) };
    revision = record.revision;
  }
  return <main id="main" className="container workspace"><Link href={`/${locale}/dashboard`}>← Dashboard</Link><h1>{locale === 'vi' ? (id === 'new' ? 'Tạo link' : 'Chỉnh sửa link') : (id === 'new' ? 'Create link' : 'Edit link')}</h1><LinkEditor key={`${source ?? 'new'}:${revision ?? 0}`} locale={locale} initial={initial} id={id === 'new' ? undefined : id} revision={revision} /></main>;
}
