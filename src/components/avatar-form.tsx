'use client';

import { useActionState } from 'react';
import type { Locale } from '@/i18n/config';
import { saveAvatar } from '@/lib/profile/avatar-actions';
import { authMessages } from '@/lib/auth/messages';
import { Alert, Button, Field } from './ui/controls';

export function AvatarForm({ locale }: { locale: Locale }) {
  const [state, submit, pending] = useActionState(saveAvatar.bind(null, locale), {});
  const t = authMessages[locale];
  return <form action={submit} className="auth-form">
    <Field id="avatar" name="avatar" type="file" label={t.avatar} accept="image/png,image/jpeg,image/webp" required />
    <p>{t.avatarHint}</p>
    {state.code ? <Alert>{t.codes[state.code]}</Alert> : null}
    <Button type="submit" disabled={pending}>{pending ? t.pending : t.uploadAvatar}</Button>
  </form>;
}
