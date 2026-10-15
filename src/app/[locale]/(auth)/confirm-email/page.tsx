import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { ConfirmationForm } from '@/components/confirmation-form';
import { authMessages } from '@/lib/auth/messages';

export default async function ConfirmEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = authMessages[locale];
  return <main id="main" className="container state-panel"><h1>{t.resend}</h1><ConfirmationForm locale={locale} /><Link href={`/${locale}/login`}>{t.login}</Link></main>;
}
