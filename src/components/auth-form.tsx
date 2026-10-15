'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { login, register, saveProfile } from '@/lib/auth/actions';
import { authMessages } from '@/lib/auth/messages';
import { Button, Field, Alert } from './ui/controls';

export function AuthForm({ locale, mode, displayName = '', next = '' }: { locale: Locale; mode: 'login' | 'register' | 'profile'; displayName?: string; next?: string }) {
  const action = mode === 'login' ? login : mode === 'register' ? register : saveProfile;
  const [state, submit, pending] = useActionState(action.bind(null, locale), {});
  const t = authMessages[locale];
  return <form action={submit} className="auth-form">
    {mode !== 'login' ? <Field id="displayName" name="displayName" label={t.name} defaultValue={displayName} required maxLength={80} autoComplete="nickname" /> : null}
    {mode !== 'profile' ? <>
      <Field id="email" name="email" type="email" label={t.email} required maxLength={254} autoComplete="email" />
      <Field id="password" name="password" type="password" label={t.password} required minLength={mode === 'register' ? 12 : 1} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
      <input type="hidden" name="next" value={next} />
      {mode === 'register' ? <p>{t.passwordHint}</p> : null}
    </> : null}
    {state.code ? <Alert>{t.codes[state.code]}</Alert> : null}
    <Button type="submit" disabled={pending}>{pending ? t.pending : mode === 'profile' ? t.save : mode === 'register' ? t.register : t.login}</Button>
    {mode !== 'profile' ? <Link href={`/${locale}/${mode === 'login' ? 'register' : 'login'}`}>{mode === 'login' ? t.register : t.login}</Link> : null}
    {mode === 'login' ? <Link href={`/${locale}/forgot-password`}>{t.forgot}</Link> : null}
    {mode === 'register' ? <Link href={`/${locale}/confirm-email`}>{t.resend}</Link> : null}
  </form>;
}
