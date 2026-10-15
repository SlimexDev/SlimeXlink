'use client';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/i18n/config';
import { allTasksDone, type Progress } from '@/lib/links/contracts';
import { Button, Alert } from './ui/controls';

export function UnlockPanel({ locale, slug, tasks }: { locale: Locale; slug: string; tasks: { id: string; title: string }[] }) {
  const vi = locale === 'vi';
  const [session, setSession] = useState('');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef<{ task: string; attempt?: string; hidden: boolean; returned: boolean; hiddenAt?: number; seconds?: number; departure?: Promise<boolean>; early?: boolean } | null>(null);
  const endpoint = `/api/links/${encodeURIComponent(slug)}`;
  const failure = vi ? 'Thao tác thất bại hoặc phiên hết hạn. Tải lại trang và thử lại.' : 'Request failed or the session expired. Reload and retry.';
  async function call(body: unknown) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
    if (!response.ok) throw new Error('REQUEST_FAILED');
    return response.json();
  }
  useEffect(() => {
    let disposed = false;
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'session' }) }).then(async (response) => {
      if (!response.ok) throw new Error('SESSION_FAILED');
      const data = await response.json();
      if (!disposed) { setSession(data.session); setProgress(data.progress); }
    }).catch(() => { if (!disposed) setError(failure); });
    return () => { disposed = true; };
  }, [endpoint, failure]);
  async function finish() {
    const attempt = active.current;
    if (!attempt?.attempt) return;
    active.current = null;
    try {
      if (await attempt.departure === false) throw new Error('DEPARTURE_FAILED');
      const result = await call({ operation: attempt.early ? 'fail' : 'finish', session, task: attempt.task, attempt: attempt.attempt });
      setProgress((rows) => [...rows.filter((row) => row.task_id !== attempt.task), { task_id: attempt.task, status: result.status }]);
    } catch { setError(failure); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const onVisibility = () => {
      const attempt = active.current;
      if (!attempt) return;
      if (document.hidden && !attempt.hidden) {
        attempt.hidden = true; attempt.hiddenAt = performance.now();
        if (attempt.attempt) attempt.departure = call({ operation: 'depart', session, task: attempt.task, attempt: attempt.attempt }).then(() => true, () => false);
      } else if (!document.hidden && attempt.hidden) {
        attempt.returned = true;
        attempt.early = performance.now() - (attempt.hiddenAt ?? performance.now()) < (attempt.seconds ?? 8) * 1000;
        void finish();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  });
  async function start(task: string) {
    setError('');
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setError(vi ? 'Hãy cho phép mở tab mới rồi thử lại.' : 'Allow popups and retry.'); return; }
    popup.opener = null;
    active.current = { task, hidden: false, returned: false };
    setBusy(true);
    try {
      const result = await call({ operation: 'start', session, task });
      if (result.status === 'done') { popup.close(); active.current = null; setBusy(false); setProgress((rows) => [...rows.filter((row) => row.task_id !== task), { task_id: task, status: 'done' }]); return; }
      if (!active.current) throw new Error('ATTEMPT_LOST');
      active.current.attempt = result.attemptId;
      active.current.seconds = result.seconds;
      if (active.current.hidden) active.current.departure = call({ operation: 'depart', session, task, attempt: result.attemptId }).then(() => true, () => false);
      setProgress((rows) => [...rows.filter((row) => row.task_id !== task), { task_id: task, status: 'running', required_seconds: result.seconds }]);
      popup.location.href = result.url;
      if (active.current.returned) void finish();
    } catch { popup.close(); active.current = null; setBusy(false); setError(failure); }
  }
  async function unlock() {
    setBusy(true); setError('');
    try { await call({ operation: 'unlock', session }); window.location.assign(new URL(`/api/unlock/${encodeURIComponent(slug)}/redirect`, window.location.origin).href); }
    catch { setError(failure); setBusy(false); }
  }
  return <section className="unlock-panel"><h2>{vi ? 'Hoàn thành các nhiệm vụ' : 'Complete each task'}</h2><p>{vi ? 'Nhấn nhiệm vụ để mở tab mới, ở lại 4–8 giây rồi quay về. Quay về sớm sẽ phải làm lại. Hệ thống ghi nhận truy cập, không xác minh theo dõi.' : 'Open each task in a new tab, stay for 4–8 seconds, then return. Returning early requires a retry. This records a visit, not a verified follow.'}</p>{error && <Alert>{error}</Alert>}
    {!session && !error && <p role="status">{vi ? 'Đang tạo phiên…' : 'Starting session…'}</p>}
    <ol className="task-list">{tasks.map((task) => { const row = progress.find((r) => r.task_id === task.id); return <li key={task.id}><div><h3>{task.title}</h3><p role="status" className={row?.status === 'failed' ? 'field-error' : ''}>{row?.status === 'done' ? (vi ? 'Đã hoàn thành' : 'Completed') : row?.status === 'failed' ? (vi ? 'Quay lại quá sớm. Hãy làm lại.' : 'Returned too soon. Retry this task.') : row?.status === 'running' ? (vi ? `Ở tab nhiệm vụ ít nhất ${row.required_seconds ?? 8} giây rồi quay về.` : `Stay on the task tab for at least ${row.required_seconds ?? 8} seconds, then return.`) : (vi ? 'Chưa hoàn thành' : 'Pending')}</p></div><Button disabled={!session || busy || row?.status === 'done'} onClick={() => void start(task.id)}>{row?.status === 'done' ? '✓' : vi ? 'Mở nhiệm vụ' : 'Open task'}</Button></li>; })}</ol>
    <Button className="primary" disabled={busy || !session || !allTasksDone(tasks.map((t) => t.id), progress)} onClick={() => void unlock()}>{vi ? 'Mở khóa nội dung' : 'Unlock content'}</Button><p>{vi ? 'Sau khi nhận URL đích, người nhận có thể chia sẻ lại URL đó.' : 'After receiving the destination URL, a recipient can share it with others.'}</p>
  </section>;
}
