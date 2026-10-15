'use client';
import { useActionState } from 'react';
import type { Locale } from '@/i18n/config';
import { submitFeedback } from '@/lib/links/feedback-actions';
import { Button, Field, Alert } from './ui/controls';
export function FeedbackForm({ locale, kind, slug = '' }: { locale: Locale; kind: 'report' | 'contact'; slug?: string }) {
  const vi = locale === 'vi';
  const [state, action, pending] = useActionState(submitFeedback.bind(null, kind, locale), {});
  const success = state.code === 'REPORT_SENT' || state.code === 'CONTACT_SENT';
  return <form className="link-form" action={action}>{state.code && <Alert>{success ? (vi ? 'Đã ghi nhận. Cảm ơn bạn.' : 'Received. Thank you.') : state.code === 'RATE_LIMITED' ? (vi ? 'Gửi quá nhiều lần. Vui lòng thử lại sau.' : 'Too many submissions. Try again later.') : (vi ? 'Không gửi được. Kiểm tra dữ liệu và thử lại.' : 'Submission failed. Check the form and retry.')}</Alert>}{kind === 'report' ? <><Field id="report-slug" label="Slug" name="slug" defaultValue={slug} required pattern="[a-z0-9][a-z0-9-]{2,63}" /><div className="field"><label htmlFor="reason">{vi ? 'Lý do' : 'Reason'}</label><select name="reason" id="reason"><option value="scam">{vi ? 'Lừa đảo' : 'Scam'}</option><option value="malware">{vi ? 'Mã độc' : 'Malware'}</option><option value="copyright">{vi ? 'Bản quyền' : 'Copyright'}</option><option value="other">{vi ? 'Khác' : 'Other'}</option></select></div></> : <><Field id="contact-name" label={vi ? 'Tên' : 'Name'} name="name" required maxLength={80} /><Field id="contact-email" label="Email" name="email" type="email" required maxLength={254} /></>}<div className="field"><label htmlFor="feedback-message">{vi ? 'Nội dung (10–2000 ký tự)' : 'Message (10–2000 characters)'}</label><textarea id="feedback-message" name={kind === 'report' ? 'details' : 'message'} required minLength={10} maxLength={2000} /></div><Button type="submit" disabled={pending}>{pending ? '…' : vi ? 'Gửi' : 'Submit'}</Button><p>{vi ? 'Thông tin được lưu để quản trị xem xét, không tự động gửi email.' : 'Submissions are stored for administrator review; no email is sent automatically.'}</p></form>;
}
