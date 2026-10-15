'use client';
import { useActionState } from 'react';
import type { Locale } from '@/i18n/config';
import { moderate } from '@/lib/links/admin-actions';
import { Button, Field, Alert } from './ui/controls';
export function ModerationForm({ locale, operation, id, enabled }: { locale: Locale; operation: 'link' | 'account' | 'report'; id: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(moderate.bind(null, locale), {});
  const vi = locale === 'vi';
  return <form action={action} className="moderation-form"><input type="hidden" name="operation" value={operation} /><input type="hidden" name="record_id" value={id} /><input type="hidden" name="enabled_value" value={String(!enabled)} /><Field id={`reason-${operation}-${id}`} label={vi ? 'Lý do quản trị' : 'Administrative reason'} name="explanation" required minLength={3} maxLength={500} /><Button type="submit" disabled={pending}>{operation === 'report' ? (vi ? 'Đánh dấu đã xử lý' : 'Resolve report') : enabled ? (vi ? 'Vô hiệu hóa' : 'Disable') : (vi ? 'Kích hoạt' : 'Enable')}</Button>{state.code && <Alert>{state.code === 'SAVED' ? (vi ? 'Đã lưu và ghi nhật ký.' : 'Saved and audited.') : (vi ? 'Không thực hiện được. Tải lại và thử lại.' : 'Action failed. Reload and retry.')}</Alert>}</form>;
}
