'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { requestRecovery, resetPassword } from '@/lib/auth/recovery-actions';
import { authMessages } from '@/lib/auth/messages';
import { Alert, Button, Field } from './ui/controls';

export function RecoveryForm({ locale, reset = false }: { locale: Locale; reset?: boolean }) {
  const [state, submit, pending] = useActionState((reset ? resetPassword : requestRecovery).bind(null, locale), {});
  const t = authMessages[locale];
  return <form action={submit} className="auth-form">
    {reset ? <>
      <Field id="new-password" name="password" type="password" label={t.password} required minLength={12} maxLength={128} autoComplete="new-password" />
      <Field id="confirm-password" name="confirmPassword" type="password" label={t.confirmPassword} required minLength={12} maxLength={128} autoComplete="new-password" />
      <p>{t.passwordHint}</p>
    </> : <Field id="recovery-email" name="email" type="email" label={t.email} required maxLength={254} autoComplete="email" />}
    {state.code ? <Alert>{t.codes[state.code]}</Alert> : null}
    <Button type="submit" disabled={pending}>{pending ? t.pending : reset ? t.resetPassword : t.sendRecovery}</Button>
    <Link href={`/${locale}/login`}>{t.login}</Link>
    {reset ? <Link href={`/${locale}/forgot-password`}>{t.sendRecovery}</Link> : null}
  </form>;
}
