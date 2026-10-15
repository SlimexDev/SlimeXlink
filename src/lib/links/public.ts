import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { linkStatus, type PublicLink } from './contracts';

export async function getPublicLink(slug: string) {
  const admin = createAdminClient();
  const result = await admin.from('links').select('id,slug,title,description,image_path,listed,revision,owner_id,enabled,expires_at').eq('slug', slug).maybeSingle();
  if (result.error) throw new Error('LINK_LOOKUP_FAILED');
  if (!result.data) return { status: 'missing' as const };
  const record = result.data;
  const access = await admin.from('account_access').select('status').eq('user_id', record.owner_id).single();
  if (access.error) throw new Error('LINK_LOOKUP_FAILED');
  const status = linkStatus(record.enabled, record.expires_at, access.data.status === 'active');
  if (status !== 'available') return { status };
  const link: PublicLink = { id: record.id, slug: record.slug, title: record.title, description: record.description, image_path: record.image_path, listed: record.listed, revision: record.revision };
  const tasks = await admin.from('link_tasks').select('id,title,position').eq('link_id', record.id).order('position');
  if (tasks.error) throw new Error('TASK_LOOKUP_FAILED');
  return { status, link, tasks: tasks.data as { id: string; title: string; position: number }[] };
}
