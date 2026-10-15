import Link from 'next/link';
import Image from 'next/image';
import { getPublicSupabaseConfig } from '@/lib/env/public';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { Button, Field } from '@/components/ui/controls';

export const metadata = { title: 'Discover · SlimeXlink', robots: { index: true, follow: true } };
export default async function Discover({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const vi = locale === 'vi';
  const query = await searchParams;
  const q = typeof query.q === 'string' ? query.q.slice(0, 100).trim() : '';
  const page = typeof query.page === 'string' && /^\d{1,5}$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
  const sort = query.sort === 'oldest' || query.sort === 'title' ? query.sort : 'newest';
  const filter = query.category === 'expiring' ? 'expiring' : 'all';
  let request = createAdminClient().from('discoverable_links').select('id,slug,title,description,image_path,created_at', { count: 'exact' });
  if (q) request = request.ilike('title', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
  if (filter === 'expiring') request = request.not('expires_at', 'is', null);
  const result = await request.order(sort === 'title' ? 'title' : 'created_at', { ascending: sort !== 'newest' }).order('id').range((page - 1) * 12, page * 12 - 1);
  if (result.error && result.error.code !== 'PGRST103') throw new Error('DISCOVERY_FAILED');
  if (result.error?.code === 'PGRST103') {
    const first = await request.range(0, 0);
    if (first.error && first.error.code !== 'PGRST103') throw new Error('DISCOVERY_FAILED');
    result.data = []; result.count = first.count ?? 0;
  }
  const records = result.data ?? [];
  const pages = Math.max(1, Math.ceil((result.count ?? 0) / 12));
  const pageHref = (number: number) => `/${locale}/discover?${new URLSearchParams({ q, sort, category: filter, page: String(number) })}`;
  return <main id="main" className="container workspace"><p className="eyebrow">SLIMEXLINK / DISCOVER</p><h1>{vi ? 'Khám phá nội dung' : 'Discover content'}</h1><p>{vi ? 'Các link được chủ sở hữu cho phép niêm yết công khai.' : 'Links their owners have chosen to list publicly.'}</p><form className="actions"><Field id="search" name="q" label={vi ? 'Tìm theo tiêu đề' : 'Search titles'} defaultValue={q} maxLength={100} /><div className="field"><label htmlFor="sort">{vi ? 'Sắp xếp' : 'Sort'}</label><select id="sort" name="sort" defaultValue={sort}><option value="newest">{vi ? 'Mới nhất' : 'Newest'}</option><option value="oldest">{vi ? 'Cũ nhất' : 'Oldest'}</option><option value="title">{vi ? 'Tiêu đề A–Z' : 'Title A–Z'}</option></select></div><div className="field"><label htmlFor="category">{vi ? 'Lọc' : 'Filter'}</label><select id="category" name="category" defaultValue={filter}><option value="all">{vi ? 'Tất cả' : 'All'}</option><option value="expiring">{vi ? 'Có ngày hết hạn' : 'With expiry'}</option></select></div><Button type="submit">{vi ? 'Tìm kiếm' : 'Search'}</Button></form><p role="status">{result.count ?? 0} {vi ? 'kết quả' : 'results'}</p><ul className="link-list">{records.map((link) => <li key={link.id}>{link.image_path && <Image className="discovery-image" src={`${getPublicSupabaseConfig()!.url}/storage/v1/object/public/link-images/${link.image_path}`} alt="" width={160} height={100} unoptimized />}<div><h2><Link href={`/${locale}/u/${link.slug}`}>{link.title}</Link></h2><p>{link.description}</p></div><Link className="button" href={`/${locale}/u/${link.slug}`}>{vi ? 'Xem link' : 'View link'}</Link></li>)}</ul>{!records.length && <p>{vi ? 'Không có link phù hợp. Thử từ khóa khác.' : 'No matching links. Try another search.'}</p>}<nav className="actions" aria-label={vi ? 'Phân trang' : 'Pagination'}>{page > 1 && <Link className="button" href={pageHref(page - 1)}>{vi ? 'Trang trước' : 'Previous'}</Link>}<span>{vi ? 'Trang' : 'Page'} {page} / {pages}</span>{page < pages && <Link className="button" href={pageHref(page + 1)}>{vi ? 'Trang sau' : 'Next'}</Link>}</nav></main>;
}
