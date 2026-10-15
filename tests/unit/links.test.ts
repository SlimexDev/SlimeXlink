import { expect, it } from 'vitest';
import { webUrlSchema, linkInputSchema, linkStatus, allTasksDone, summarizeEvents } from '../../src/lib/links/contracts';
it('accepts only complete http/https URLs without credentials or control characters', () => {
  for (const url of ['https://example.com/path?a=1', 'http://localhost:3000/test']) expect(webUrlSchema.safeParse(url).success).toBe(true);
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.example', 'https://user:pass@example.com', 'https://', 'https://example.com/\nsecret', 'https:example.com', 'https://example.com\\path']) expect(webUrlSchema.safeParse(url).success).toBe(false);
});
it('validates link and task limits and rejects privilege fields', () => {
  const link = { title: 'A', description: '', slug: 'my-link', destination: 'https://example.com', listed: false, enabled: true, expiresAt: null, imagePath: null, tasks: [{ title: 'Visit', url: 'https://example.org' }] };
  expect(linkInputSchema.safeParse(link).success).toBe(true);
  expect(linkInputSchema.safeParse({ ...link, tasks: [] }).success).toBe(false);
  expect(linkInputSchema.safeParse({ ...link, tasks: Array.from({ length: 11 }, () => link.tasks[0]) }).success).toBe(false);
  expect(linkInputSchema.safeParse({ ...link, owner_id: crypto.randomUUID() }).success).toBe(false);
});
it('expires at the exact boundary and refuses disabled or suspended-owner links', () => {
  expect(linkStatus(true, new Date(1000).toISOString(), true, 999)).toBe('available');
  expect(linkStatus(true, new Date(1000).toISOString(), true, 1000)).toBe('expired');
  expect(linkStatus(false, null, true)).toBe('disabled');
  expect(linkStatus(true, null, false)).toBe('unavailable');
  expect(allTasksDone(['a','b'], [{ task_id: 'a', status: 'done' }])).toBe(false);
  expect(allTasksDone([], [])).toBe(false);
  expect(allTasksDone(['a'], [{ task_id: 'a', status: 'done' }])).toBe(true);
});
it('counts each visitor/link event once per UTC day within the requested range', () => {
  const event = { visitor_hash: 'hash', event_day: '2026-10-16', kind: 'view' };
  const result = summarizeEvents([event, event, { ...event, kind: 'unlock' }, { ...event, event_day: '2025-01-01' }], 7, Date.parse('2026-10-16T08:00:00Z'));
  expect(result.views).toBe(1); expect(result.unlocks).toBe(1);
});
