import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { RecoveryForm } from '@/components/recovery-form';
import { authMessages } from '@/lib/auth/messages';
import { requireActor } from '@/lib/auth/guards';
import { getRecoveryGrant } from '@/lib/auth/recovery';
import { recoveryCookie } from '@/lib/auth/recovery-token';

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = authMessages[locale];
  let allowed = false;
  if ((await cookies()).has(recoveryCookie)) {
    const actor = await requireActor(locale);
    allowed = !!await getRecoveryGrant(actor.client, actor.user.id);
  }
  return <main id="main" className="container state-panel"><h1>{t.resetPassword}</h1>{allowed ? <RecoveryForm locale={locale} reset /> : <><p role="alert">{t.codes.RECOVERY_EXPIRED}</p><Link href={`/${locale}/forgot-password`}>{t.sendRecovery}</Link></>}</main>;
}
