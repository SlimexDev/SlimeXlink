import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { AuthForm } from '@/components/auth-form';
import { authMessages } from '@/lib/auth/messages';
import { googleLogin } from '@/lib/auth/actions';
import { Button } from '@/components/ui/controls';

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; error?: string; notice?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const t = authMessages[locale];
  const message = query.error && Object.hasOwn(t.codes, query.error) ? t.codes[query.error as keyof typeof t.codes] : null;
  return <main id="main" className="container state-panel"><h1>{t.login}</h1>{message ? <p role="alert">{message}</p> : null}{query.notice === 'PASSWORD_CHANGED' ? <p role="status">{t.codes.PASSWORD_CHANGED}</p> : null}<AuthForm locale={locale} mode="login" next={query.next} /><form action={googleLogin.bind(null, locale)}><Button type="submit" disabled={process.env.AUTH_GOOGLE_ENABLED !== 'true'}>{t.google}</Button></form>{process.env.AUTH_GOOGLE_ENABLED !== 'true' ? <p>{t.codes.PROVIDER_NOT_CONFIGURED}</p> : null}</main>;
}
