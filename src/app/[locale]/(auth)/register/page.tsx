import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { AuthForm } from '@/components/auth-form';
import { authMessages } from '@/lib/auth/messages';

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main id="main" className="container state-panel"><h1>{authMessages[locale].register}</h1><AuthForm mode="register" locale={locale} /></main>;
}
