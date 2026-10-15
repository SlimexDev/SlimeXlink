import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { RecoveryForm } from '@/components/recovery-form';
import { authMessages } from '@/lib/auth/messages';

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main id="main" className="container state-panel"><h1>{authMessages[locale].forgot}</h1><RecoveryForm locale={locale} /></main>;
}
