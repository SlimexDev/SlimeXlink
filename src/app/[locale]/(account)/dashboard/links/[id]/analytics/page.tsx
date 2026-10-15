import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { isLocale } from '@/i18n/config';
import { requireActor } from '@/lib/auth/guards';
import { summarizeEvents } from '@/lib/links/contracts';

export default async function Analytics({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ days?: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !z.uuid().safeParse(id).success) notFound();
  const actor = await requireActor(locale);
  const link = await actor.client.from('links').select('title').eq('id', id).eq('owner_id', actor.user.id).maybeSingle();
  if (link.error) throw new Error('ANALYTICS_FAILED');
  if (!link.data) notFound();
  const { days: selection } = await searchParams;
  const days = selection === '7' ? 7 : selection === '90' ? 90 : 30;
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days + 1);
  const events: { visitor_hash: string; event_day: string; kind: string }[] = [];
  // Fetch pages so PostgREST's row cap cannot silently truncate totals.
  for (let offset = 0; ; offset += 1000) {
    const result = await actor.client.from('link_events').select('visitor_hash,event_day,kind,id').eq('link_id', id).gte('event_day', start.toISOString().slice(0,10)).order('id').range(offset, offset + 999);
    if (result.error) throw new Error('ANALYTICS_FAILED');
    events.push(...result.data);
    if (result.data.length < 1000) break;
  }
  const stats = summarizeEvents(events, days);
  const vi = locale === 'vi';
  return <main id="main" className="container workspace"><Link href={`/${locale}/dashboard/links/${id}`}>← {vi ? 'Quản lý link' : 'Manage link'}</Link><h1>{vi ? 'Thống kê' : 'Statistics'} · {link.data.title}</h1><nav className="actions" aria-label={vi ? 'Khoảng thời gian' : 'Date range'}>{[7,30,90].map((value) => <Link className="button" key={value} aria-current={days === value ? 'page' : undefined} href={`?days=${value}`}>{value} {vi ? 'ngày' : 'days'}</Link>)}</nav><p>{vi ? 'Mỗi mã khách/link/ngày UTC chỉ tính tối đa một lượt xem và một lượt mở khóa. Tải lại hoặc retry không tăng số đếm. Đây không phải số người duy nhất; xóa cookie hoặc đổi thiết bị có thể được tính lại. Giữ dữ liệu 90 ngày.' : 'Each visitor identifier/link/UTC day counts at most one view and one unlock. Reloads and retries do not increase counts. These are not unique people; clearing cookies or switching devices can count again. Data is retained for 90 days.'}</p><div className="stats"><p><strong>{stats.views}</strong>{vi ? 'Lượt xem' : 'Views'}</p><p><strong>{stats.unlocks}</strong>{vi ? 'Lượt mở khóa' : 'Unlocks'}</p></div>{stats.rows.length ? <div className="table-scroll"><table><caption>{vi ? 'Thống kê theo ngày UTC' : 'Daily statistics (UTC)'}</caption><thead><tr><th>{vi ? 'Ngày' : 'Date'}</th><th>{vi ? 'Lượt xem' : 'Views'}</th><th>{vi ? 'Mở khóa' : 'Unlocks'}</th></tr></thead><tbody>{stats.rows.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.views}</td><td>{row.unlocks}</td></tr>)}</tbody></table></div> : <p>{vi ? 'Chưa có lượt truy cập trong khoảng này.' : 'No visits in this date range.'}</p>}</main>;
}
