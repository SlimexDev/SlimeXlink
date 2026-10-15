import { z } from 'zod';

export const webUrlSchema = z.string().min(8).max(2048).refine((value) => {
  if (!/^https?:\/\//.test(value) || /[\\\s\u0000-\u001f\u007f]/.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; }
}, 'INVALID_URL');
export const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/);
export const taskInputSchema = z.object({ title: z.string().trim().min(1).max(80), url: webUrlSchema }).strict();
export const linkInputSchema = z.object({
  title: z.string().trim().min(1).max(120), description: z.string().max(2000), slug: slugSchema,
  destination: webUrlSchema, listed: z.boolean(), enabled: z.boolean(), expiresAt: z.iso.datetime({ offset: true }).nullable(),
  imagePath: z.string().max(180).nullable(), tasks: z.array(taskInputSchema).min(1).max(10),
}).strict();
export type LinkInput = z.infer<typeof linkInputSchema>;
export const linkRecordSchema = z.object({
  id: z.uuid(), owner_id: z.uuid(), slug: slugSchema, title: z.string(), description: z.string(), image_path: z.string().nullable(),
  listed: z.boolean(), enabled: z.boolean(), expires_at: z.string().nullable(), revision: z.number().int(), created_at: z.string(), updated_at: z.string(),
});
export type LinkRecord = z.infer<typeof linkRecordSchema>;
export const taskRecordSchema = z.object({ id: z.uuid(), title: z.string(), url: webUrlSchema, position: z.number().int(), kind: z.literal('visit') });
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export type PublicLink = Pick<LinkRecord, 'id' | 'slug' | 'title' | 'description' | 'image_path' | 'listed' | 'revision'>;
export type Progress = { task_id: string; status: string; attempt_id?: string; required_seconds?: number };
export type LinkCode = 'INVALID_INPUT' | 'INVALID_IMAGE' | 'CONFLICT' | 'SLUG_TAKEN' | 'UNAVAILABLE' | 'SAVED' | 'DELETED' | 'COPIED' | 'REPORT_SENT' | 'CONTACT_SENT' | 'RATE_LIMITED';
export type LinkState = { code?: LinkCode };

export function linkStatus(enabled: boolean, expires: string | null, ownerActive: boolean, now = Date.now()) {
  if (!ownerActive) return 'unavailable';
  if (!enabled) return 'disabled';
  if (expires && (!Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= now)) return 'expired';
  return 'available';
}
export function allTasksDone(ids: string[], results: Progress[]) {
  return ids.length > 0 && ids.every((id) => results.some((result) => result.task_id === id && result.status === 'done'));
}
export function summarizeEvents(events: { visitor_hash: string; event_day: string; kind: string }[], days: number, now = Date.now()) {
  const start = new Date(now); start.setUTCHours(0,0,0,0); start.setUTCDate(start.getUTCDate() - days + 1);
  const end = new Date(now).toISOString().slice(0,10);
  const daily = new Map<string, { day: string; views: number; unlocks: number }>();
  const seen = new Set<string>();
  for (const event of events) {
    if (event.event_day < start.toISOString().slice(0,10) || event.event_day > end || !['view','unlock'].includes(event.kind)) continue;
    const key = `${event.visitor_hash}:${event.event_day}:${event.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const row = daily.get(event.event_day) ?? { day: event.event_day, views: 0, unlocks: 0 };
    if (event.kind === 'view') row.views++; else row.unlocks++;
    daily.set(event.event_day, row);
  }
  const rows = [...daily.values()].sort((a,b) => a.day.localeCompare(b.day));
  return { views: rows.reduce((sum,row) => sum + row.views,0), unlocks: rows.reduce((sum,row) => sum + row.unlocks,0), rows };
}
