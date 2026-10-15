'use client';

import { useActionState } from 'react';
import type { Locale } from '@/i18n/config';
import { resendConfirmation } from '@/lib/auth/actions';
import { authMessages } from '@/lib/auth/messages';
import { Alert, Button, Field } from './ui/controls';

export function ConfirmationForm({ locale }: { locale: Locale }) {
  const [state, submit, pending] = useActionState(resendConfirmation.bind(null, locale), {});
  const t = authMessages[locale];
  return <form action={submit} className="auth-form">
    <p>{t.confirmationHint}</p>
    <Field id="confirmation-email" name="email" type="email" label={t.email} required maxLength={254} autoComplete="email" />
    {state.code ? <Alert>{t.codes[state.code]}</Alert> : null}
    <Button type="submit" disabled={pending}>{pending ? t.pending : t.resend}</Button>
  </form>;
}
