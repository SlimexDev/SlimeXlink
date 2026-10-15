'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { LinkInput } from '@/lib/links/contracts';
import { saveLink, deleteLink } from '@/lib/links/actions';
import { Button, Field, Alert } from './ui/controls';

export function LinkEditor({ locale, initial, id, revision }: { locale: Locale; initial?: LinkInput; id?: string; revision?: number }) {
  const vi = locale === 'vi';
  const [input, setInput] = useState<LinkInput>(initial ?? { title: '', description: '', slug: '', destination: '', listed: false, enabled: true, expiresAt: null, imagePath: null, tasks: [{ title: '', url: '' }] });
  const [state, action, pending] = useActionState(saveLink.bind(null, locale), {});
  const [deletion, remove, deleting] = useActionState(deleteLink.bind(null, locale), {});
  const [copied, setCopied] = useState(false);
  const messages = vi ? { INVALID_INPUT: 'Kiểm tra tiêu đề, slug, URL và các nhiệm vụ.', CONFLICT: 'Không lưu được hoặc dữ liệu đã thay đổi. Hãy tải lại trang và thử lại.', SLUG_TAKEN: 'Slug này đã được sử dụng.', RATE_LIMITED: 'Bạn thao tác quá nhanh. Hãy thử lại sau.' } : { INVALID_INPUT: 'Check the title, slug, URLs and tasks.', CONFLICT: 'Save failed or the record changed. Reload and retry.', SLUG_TAKEN: 'This slug is already used.', RATE_LIMITED: 'Too many requests. Try again later.' };
  const changeTask = (index: number, key: 'title' | 'url', value: string) => setInput({ ...input, tasks: input.tasks.map((task, i) => i === index ? { ...task, [key]: value } : task) });
  return <div className="editor"><form action={action} className="link-form">
    <input type="hidden" name="payload" value={JSON.stringify(input)} /><input type="hidden" name="id" value={id ?? ''} /><input type="hidden" name="revision" value={revision ?? ''} />
    {state.code && <Alert>{messages[state.code as keyof typeof messages] ?? (vi ? 'Có lỗi. Vui lòng thử lại.' : 'Request failed. Please retry.')}</Alert>}
    <Field id="link-title" label={vi ? 'Tiêu đề' : 'Title'} required maxLength={120} value={input.title} onChange={(e) => setInput({ ...input, title: e.target.value })} />
    <Field id="link-slug" label="Slug" required pattern="[a-z0-9][a-z0-9-]{2,63}" value={input.slug} onChange={(e) => setInput({ ...input, slug: e.target.value })} />
    <p>{vi ? '3–64 ký tự: chữ thường, số và dấu gạch ngang.' : '3–64 lowercase letters, numbers and hyphens.'}</p>
    <div className="field"><label htmlFor="description">{vi ? 'Mô tả' : 'Description'}</label><textarea id="description" maxLength={2000} value={input.description} onChange={(e) => setInput({ ...input, description: e.target.value })} /></div>
    <Field id="destination" label={vi ? 'URL đích riêng tư' : 'Private destination URL'} type="url" required value={input.destination} onChange={(e) => setInput({ ...input, destination: e.target.value })} />
    <Field id="link-image" name="image" label={vi ? 'Ảnh link (PNG, JPG, WebP; tối đa 1 MiB)' : 'Link image (PNG, JPG, WebP; max 1 MiB)'} type="file" accept="image/png,image/jpeg,image/webp" />
    {input.imagePath && <label><input type="checkbox" onChange={(e) => setInput({ ...input, imagePath: e.target.checked ? null : initial?.imagePath ?? null })} /> {vi ? 'Gỡ ảnh hiện tại' : 'Remove current image'}</label>}
    <label><input type="checkbox" checked={input.listed} onChange={(e) => setInput({ ...input, listed: e.target.checked })} /> {vi ? 'Xuất hiện trong khám phá' : 'List in discovery'}</label>
    <p>{vi ? 'Không niêm yết vẫn truy cập được nếu có URL chia sẻ.' : 'Unlisted links remain accessible to anyone with their shared URL.'}</p>
    <label><input type="checkbox" checked={input.enabled} onChange={(e) => setInput({ ...input, enabled: e.target.checked })} /> {vi ? 'Bật link' : 'Enable link'}</label>
    <Field id="expires" label={vi ? 'Hết hạn (tùy chọn, giờ địa phương)' : 'Expiry (optional, local time)'} type="datetime-local" value={input.expiresAt ? new Date(Date.parse(input.expiresAt) - new Date(input.expiresAt).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} onChange={(e) => setInput({ ...input, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
    <h2>{vi ? 'Nhiệm vụ truy cập' : 'Visit tasks'}</h2><p>{vi ? 'Mở tab nhiệm vụ và ở lại 4–8 giây. Quay về sớm phải làm lại. Đây không phải xác minh follow/subscribe.' : 'Open each task and stay away for 4–8 seconds. Returning early requires retrying. This does not verify follows or subscriptions.'}</p>
    {input.tasks.map((task, index) => <fieldset key={index}><legend>{vi ? 'Nhiệm vụ' : 'Task'} {index + 1}</legend><Field id={`task-title-${index}`} label={vi ? 'Tên nhiệm vụ' : 'Task title'} required maxLength={80} value={task.title} onChange={(e) => changeTask(index, 'title', e.target.value)} /><Field id={`task-url-${index}`} label="URL" type="url" required value={task.url} onChange={(e) => changeTask(index, 'url', e.target.value)} /><div className="actions"><Button disabled={index === 0} aria-label={vi ? 'Di chuyển lên' : 'Move up'} onClick={() => { const tasks = [...input.tasks]; [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]]; setInput({ ...input, tasks }); }}>↑</Button><Button disabled={index === input.tasks.length - 1} aria-label={vi ? 'Di chuyển xuống' : 'Move down'} onClick={() => { const tasks = [...input.tasks]; [tasks[index + 1], tasks[index]] = [tasks[index], tasks[index + 1]]; setInput({ ...input, tasks }); }}>↓</Button><Button disabled={input.tasks.length === 1} onClick={() => setInput({ ...input, tasks: input.tasks.filter((_, i) => i !== index) })}>{vi ? 'Xóa nhiệm vụ' : 'Remove task'}</Button></div></fieldset>)}
    <Button disabled={input.tasks.length >= 10} onClick={() => setInput({ ...input, tasks: [...input.tasks, { title: '', url: '' }] })}>{vi ? 'Thêm nhiệm vụ' : 'Add task'}</Button>
    <Button type="submit" disabled={pending} className="primary">{pending ? '…' : vi ? 'Lưu link' : 'Save link'}</Button>
  </form>{id && <><div className="actions"><Link className="button" href={`/${locale}/dashboard/links/${id}/analytics`}>{vi ? "Thống kê" : "Statistics"}</Link><Link className="button" href={`/${locale}/u/${initial?.slug}`}>{vi ? 'Xem trang mở khóa' : 'View unlock page'}</Link><Button onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/${locale}/u/${initial?.slug}`); setCopied(true); } catch { setCopied(false); } }}>{copied ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép URL' : 'Copy URL')}</Button><Link className="button" href={`/${locale}/dashboard/links/new?copy=${id}`}>{vi ? 'Nhân bản' : 'Duplicate'}</Link></div><form action={remove} className="link-form"><input type="hidden" name="id" value={id} /><input type="hidden" name="revision" value={revision} /><label><input type="checkbox" name="confirm" value="yes" required /> {vi ? 'Xác nhận xóa link cùng nhiệm vụ và thống kê. Không thể hoàn tác.' : 'Delete this link, its tasks and statistics permanently.'}</label>{deletion.code && <Alert>{vi ? 'Xóa thất bại. Tải lại trang và thử lại.' : 'Delete failed. Reload and retry.'}</Alert>}<Button type="submit" disabled={deleting}>{vi ? 'Xóa link' : 'Delete link'}</Button></form></>}
  </div>;
}
