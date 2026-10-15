import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isLocale } from '@/i18n/config';
import { requireAdmin } from '@/lib/auth/guards';
import { ModerationForm } from '@/components/moderation-form';
import { Button, Field } from '@/components/ui/controls';

export default async function AdminPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const actor = await requireAdmin(locale);
  const vi = locale === 'vi';
  const query = await searchParams;
  const section = ['users','reports','audit','contacts'].includes(query.section ?? '') ? query.section! : 'links';
  const q = (query.q ?? '').slice(0,100).trim();
  const filter = query.filter ?? 'all';
  const page = /^\d{1,5}$/.test(query.page ?? '') ? Math.max(1, Number(query.page)) : 1;
  const from = (page - 1) * 20;
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  let request;
  if (section === 'users') {
    request = actor.client.from('admin_directory').select('id,display_name,created_at,role,status', { count: 'exact' });
    if (q) request = request.ilike('display_name', pattern);
    if (['active','suspended'].includes(filter)) request = request.eq('status', filter);
  } else if (section === 'reports') {
    request = actor.client.from('reports').select('id,slug,reason,details,status,created_at', { count: 'exact' });
    if (q) request = request.ilike('slug', pattern);
    if (['open','resolved'].includes(filter)) request = request.eq('status', filter);
  } else if (section === 'audit') {
    request = actor.client.from('admin_audit').select('id,actor_id,action,target_id,reason,created_at', { count: 'exact' });
    if (q) request = request.ilike('action', pattern);
  } else if (section === 'contacts') {
    request = actor.client.from('contact_messages').select('id,name,email,message,created_at', { count: 'exact' });
    if (q) request = request.ilike('name', pattern);
  } else {
    request = actor.client.from('links').select('id,title,slug,enabled,owner_id,created_at', { count: 'exact' });
    if (q) request = request.ilike('title', pattern);
    if (['enabled','disabled'].includes(filter)) request = request.eq('enabled', filter === 'enabled');
  }
  const result = await request.order('created_at', { ascending: false }).order('id').range(from, from + 19);
  if (result.error?.code === 'PGRST103') {
    const first = await request.range(0, 0);
    if (first.error && first.error.code !== 'PGRST103') throw new Error('ADMIN_LIST_FAILED');
    result.data = []; result.count = first.count ?? 0;
  }
  if (result.error && result.error.code !== 'PGRST103') throw new Error('ADMIN_LIST_FAILED');
  const rows = result.data as Record<string, string | boolean>[];
  const access = section === 'users' && rows.length ? await actor.client.from('account_access').select('user_id,role,status').in('user_id', rows.map((r) => String(r.id))) : { data: [], error: null };
  if (access.error) throw new Error('ADMIN_ACCESS_FAILED');
  const href = (number: number) => `?${new URLSearchParams({ section, q, filter, page: String(number) })}`;
  return <main id="main" className="container workspace"><h1>{vi ? 'Quản trị' : 'Administration'}</h1><nav className="actions" aria-label="Admin">{['links','users','reports','contacts','audit'].map((value, index) => <Link className="button" key={value} href={`?section=${value}`} aria-current={section === value ? 'page' : undefined}>{(vi ? ['Link','Người dùng','Báo cáo','Liên hệ','Nhật ký'] : ['Links','Users','Reports','Contacts','Audit'])[index]}</Link>)}</nav><form className="actions"><input type="hidden" name="section" value={section} /><Field id="admin-search" label={vi ? 'Tìm kiếm' : 'Search'} name="q" defaultValue={q} maxLength={100} /><div className="field"><label htmlFor="admin-filter">{vi ? 'Trạng thái' : 'Status'}</label><select id="admin-filter" name="filter" defaultValue={filter}><option value="all">{vi ? 'Tất cả' : 'All'}</option>{(section === 'reports' ? ['open','resolved'] : section === 'users' ? ['active','suspended'] : ['enabled','disabled']).map((s) => <option key={s}>{s}</option>)}</select></div><Button type="submit">{vi ? 'Lọc' : 'Filter'}</Button></form><p>{result.count ?? 0} {vi ? 'kết quả' : 'results'}</p><ul className="link-list">{rows.map((row) => { const permission = access.data?.find((a) => a.user_id === row.id); return <li key={String(row.id)}><div><h2>{String(row.title ?? row.display_name ?? row.slug ?? row.name ?? row.action ?? row.id)}</h2><p>{String(row.id)} · {String(row.created_at)}</p>{section === 'links' && <p>/{String(row.slug)} · {row.enabled ? 'enabled' : 'disabled'}</p>}{section === 'users' && <p>{permission?.role} · {permission?.status}</p>}{section === 'reports' && <p>{String(row.reason)} · {String(row.status)} — {String(row.details)}</p>}{section === 'contacts' && <p>{String(row.email)} — {String(row.message)}</p>}{section === 'audit' && <p>{String(row.actor_id)} → {String(row.target_id)} · {String(row.reason)}</p>}{section === 'links' && <ModerationForm locale={locale} operation="link" id={String(row.id)} enabled={row.enabled === true} />}{section === 'users' && permission?.role === 'member' && <ModerationForm locale={locale} operation="account" id={String(row.id)} enabled={permission.status === 'active'} />}{section === 'reports' && row.status === 'open' && <ModerationForm locale={locale} operation="report" id={String(row.id)} enabled={false} />}</div></li>; })}</ul>{!rows.length && <p>{vi ? 'Chưa có dữ liệu phù hợp.' : 'No matching records.'}</p>}<nav className="actions" aria-label={vi ? 'Phân trang' : 'Pagination'}>{page > 1 && <Link className="button" href={href(page - 1)}>{vi ? 'Trước' : 'Previous'}</Link>}<span>{page}</span>{page * 20 < (result.count ?? 0) && <Link className="button" href={href(page + 1)}>{vi ? 'Sau' : 'Next'}</Link>}</nav></main>;
}
