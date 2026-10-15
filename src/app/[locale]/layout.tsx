import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connection } from 'next/server';
import { isLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import '../globals.css';
import { siteOrigin } from '@/lib/auth/service';

export const metadata: Metadata = {
  title: 'SlimeXlink',
  robots: { index: false, follow: false },
  metadataBase: new URL(siteOrigin()),
  description: 'SlimeXlink — chia sẻ nội dung với các bước truy cập rõ ràng. Share content on your terms.',
  openGraph: { type: 'website', siteName: 'SlimeXlink', title: 'SlimeXlink', description: 'Chia sẻ nội dung theo cách của bạn. Share content on your terms.' },
};

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await connection();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  return <html lang={locale}><body>
    <a className="skip-link" href="#main">{t.skip}</a>
    <header className="site-header"><div className="container header-inner">
      <Link prefetch={false} className="brand" href={`/${locale}`}>
        <span className="brand-mark" aria-hidden="true">s<span>↗</span></span>
        <span>Slime<span className="brand-x">X</span>link</span>
      </Link>
      <nav aria-label={t.overview}><Link prefetch={false} href={`/${locale}/discover`}>{locale === 'vi' ? 'Khám phá' : 'Discover'}</Link><Link prefetch={false} href={`/${locale}/guide`}>{locale === 'vi' ? 'Hướng dẫn' : 'Guide'}</Link><Link prefetch={false} href={`/${locale}/dashboard`}>Dashboard</Link></nav>
      <LanguageSwitcher locale={locale} label={t.language} />
    </div></header>
    {children}
    <footer className="container site-footer"><span>© {new Date().getUTCFullYear()} SlimeXlink · {t.footer}</span><nav className="footer-links" aria-label={locale === 'vi' ? 'Chính sách và hỗ trợ' : 'Policies and support'}>{['privacy', 'terms', 'acceptable-use', 'contact', 'report'].map((path, index) => <Link prefetch={false} key={path} href={`/${locale}/${path}`}>{(locale === 'vi' ? ['Riêng tư', 'Điều khoản', 'Nội dung', 'Liên hệ', 'Báo cáo'] : ['Privacy', 'Terms', 'Content', 'Contact', 'Report'])[index]}</Link>)}</nav></footer>
  </body></html>;
}
