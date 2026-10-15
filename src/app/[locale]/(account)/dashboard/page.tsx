import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { requireActor } from '@/lib/auth/guards';
import { authMessages } from '@/lib/auth/messages';
import { logout } from '@/lib/auth/actions';
import { Button } from '@/components/ui/controls';
import { linkRecordSchema, linkStatus } from '@/lib/links/contracts';
import { z } from 'zod';

export default async function Dashboard({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const actor = await requireActor(locale);
  const t = authMessages[locale];
  const query = await searchParams;
  const page = /^\d{1,5}$/.test(query.page ?? '') ? Math.max(1, Number(query.page)) : 1;
  const request = actor.client.from('links').select('*', { count: 'exact' }).eq('owner_id', actor.user.id).order('created_at', { ascending: false }).order('id');
  const result = await request.range((page - 1) * 20, page * 20 - 1);
  if (result.error?.code === 'PGRST103') {
    const first = await request.range(0, 0);
    if (first.error && first.error.code !== 'PGRST103') throw new Error('LINK_LIST_FAILED');
    result.data = []; result.count = first.count ?? 0;
  }
  if (result.error && result.error.code !== 'PGRST103') throw new Error('LINK_LIST_FAILED');
  const links = z.array(linkRecordSchema).parse(result.data);
  const statusLabels = locale === 'vi' ? { available: 'Đang hoạt động', disabled: 'Đã tắt', expired: 'Đã hết hạn', unavailable: 'Không khả dụng' } : { available: 'Active', disabled: 'Disabled', expired: 'Expired', unavailable: 'Unavailable' };
  const vi = locale === 'vi';
  return <main id="main" className="container workspace"><h1>{t.dashboard}</h1><p>{actor.user.email}</p><p>{t.role}: {t[actor.role]}</p><div className="actions"><Link className="button primary" href={`/${locale}/dashboard/links/new`}>{vi ? 'Tạo link' : 'Create link'}</Link><Link className="button" href={`/${locale}/settings`}>{t.profile}</Link>{actor.role === 'admin' && <Link className="button" href={`/${locale}/admin`}>Admin</Link>}<form action={logout.bind(null, locale)}><Button type="submit">{t.logout}</Button></form></div><h2>{vi ? 'Link của bạn' : 'Your links'}</h2>{!links.length && <p>{vi ? 'Bạn chưa tạo link nào. Hãy bắt đầu với link đầu tiên.' : 'No links yet. Create your first link.'}</p>}<ul className="link-list">{links.map((link) => <li key={link.id}><div><h3><Link href={`/${locale}/dashboard/links/${link.id}`}>{link.title}</Link></h3><p>/{link.slug} · {statusLabels[linkStatus(link.enabled, link.expires_at, true)]} · {link.listed ? (vi ? 'Công khai' : 'Listed') : (vi ? 'Không niêm yết' : 'Unlisted')}</p></div><Link className="button" href={`/${locale}/dashboard/links/${link.id}`}>{vi ? 'Quản lý' : 'Manage'}</Link></li>)}</ul><nav className="actions" aria-label={vi ? "Phân trang" : "Pagination"}>{page > 1 && <Link className="button" href={`?page=${page - 1}`}>{vi ? "Trước" : "Previous"}</Link>}<span>{page}</span>{page * 20 < (result.count ?? 0) && <Link className="button" href={`?page=${page + 1}`}>{vi ? "Sau" : "Next"}</Link>}</nav></main>;
}
