import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connection } from 'next/server';
import { isLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import '../globals.css';

export const metadata: Metadata = {
  title: 'SlimeXlink',
  robots: { index: false, follow: false },
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
      <Link className="brand" href={`/${locale}`} aria-label="SlimeXlink">
        <span className="brand-mark" aria-hidden="true">s<span>↗</span></span>
        <span>Slime<span className="brand-x">X</span>link</span>
      </Link>
      <nav aria-label={t.overview}><Link href={`/${locale}`}>{t.overview}</Link><a href={`/${locale}#status`}>{t.status}</a></nav>
      <LanguageSwitcher locale={locale} label={t.language} />
    </div></header>
    {children}
    <footer className="container site-footer"><span>© {new Date().getUTCFullYear()} SlimeXlink</span><span>{t.footer}</span></footer>
  </body></html>;
}
