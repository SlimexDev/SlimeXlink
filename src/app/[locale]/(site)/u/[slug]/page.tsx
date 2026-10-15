import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getPublicLink } from '@/lib/links/public';
import { UnlockPanel } from '@/components/unlock-panel';
import Link from 'next/link';
import Image from 'next/image';
import { getPublicSupabaseConfig } from '@/lib/env/public';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicLink(slug);
  return { title: result.link?.title ?? 'SlimeXlink', robots: { index: !!result.link?.listed, follow: !!result.link?.listed }, description: result.link?.description, openGraph: { title: result.link?.title ?? 'SlimeXlink', description: result.link?.description ?? '', siteName: 'SlimeXlink', type: 'website' } };
}
export default async function UnlockPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const result = await getPublicLink(slug);
  const vi = locale === 'vi';
  if (!result.link) return <main id="main" className="container state-panel"><h1>{vi ? 'Link không khả dụng' : 'Link unavailable'}</h1><p>{result.status === 'expired' ? (vi ? 'Link này đã hết hạn.' : 'This link has expired.') : result.status === 'disabled' ? (vi ? 'Link này đã bị tắt.' : 'This link is disabled.') : (vi ? 'Không tìm thấy link hoặc tài khoản chủ sở hữu không hoạt động.' : 'Link missing or its owner is unavailable.')}</p><Link className="button" href={`/${locale}`}>{vi ? 'Trang chủ' : 'Home'}</Link></main>;
  const image = result.link.image_path ? `${getPublicSupabaseConfig()!.url}/storage/v1/object/public/link-images/${result.link.image_path}` : null;
  return <main id="main" className="container workspace"><p className="eyebrow">SLIMEXLINK · {vi ? 'CHIA SẺ NỘI DUNG' : 'SHARED CONTENT'}</p><h1>{result.link.title}</h1>{image && <Image className="link-image" src={image} alt={result.link.title} width={760} height={430} unoptimized />}<p className="content-description">{result.link.description}</p><UnlockPanel locale={locale} slug={slug} tasks={result.tasks ?? []} /><Link href={`/${locale}/report?slug=${encodeURIComponent(slug)}`}>{vi ? 'Báo cáo link' : 'Report link'}</Link></main>;
}
