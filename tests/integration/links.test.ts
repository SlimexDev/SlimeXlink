import { expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getTestConfig } from './setup';

it('isolates links and enforces task timing, session binding and one-use grants', async () => {
  const config = getTestConfig();
  const secret = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Test admin key required.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(config.url, secret, options);
  const client = () => createClient(config.url, config.publishableKey, options);
  const users: string[] = [];
  try {
    const sessions = [];
    for (let i = 0; i < 2; i++) {
      const email = `links-${crypto.randomUUID()}@example.test`;
      const password = `Test-${crypto.randomUUID()}`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error('Link fixture failed.');
      users.push(created.data.user.id);
      const session = client();
      expect((await session.auth.signInWithPassword({ email, password })).error).toBeNull();
      sessions.push(session);
    }
    const payload = { title: 'Integration link', description: '', slug: `test-${crypto.randomUUID()}`, destination: 'https://example.com/private-content', listed: true, enabled: true, expiresAt: null, imagePath: null, tasks: [{ title: 'Visit', url: 'https://example.com/task' }] };
    const saved = await sessions[0].rpc('save_link', { payload });
    expect(saved.error).toBeNull();
    const link = saved.data as string;
    expect((await sessions[1].from('link_targets').select('*').eq('link_id', link)).data).toEqual([]);
    expect((await client().from('link_targets').select('*')).error).not.toBeNull();
    expect((await sessions[1].rpc('save_link', { payload, record_id: link, expected_revision: 1 })).error).not.toBeNull();
    expect((await sessions[0].from('links').update({ owner_id: users[1] }).eq('id', link)).error).not.toBeNull();
    const tasks = await sessions[0].from('link_tasks').select('id').eq('link_id', link);
    const task = tasks.data?.[0]?.id as string;
    expect(task).toBeTruthy();
    const visitor = 'a'.repeat(64);
    const opened = await Promise.all([1, 2].map(() => admin.rpc('open_unlock_session', { link_uuid: link, visitor })));
    expect(opened.every((r) => !r.error)).toBe(true);
    expect(opened[0].data).toBe(opened[1].data);
    const session = opened[0].data as string;
    const args = { session_uuid: session, visitor, task_uuid: task };
    expect((await sessions[0].rpc('start_link_task', args)).error).not.toBeNull();
    expect((await admin.rpc('start_link_task', { ...args, visitor: 'b'.repeat(64) })).error).not.toBeNull();
    const grant = { session_uuid: session, visitor, link_uuid: link, grant_hash: 'c'.repeat(64) };
    expect((await admin.rpc('issue_unlock', grant)).error).not.toBeNull();
    const started = await admin.rpc('start_link_task', args);
    expect(started.error).toBeNull();
    expect(started.data.seconds).toBeGreaterThanOrEqual(4);
    expect(started.data.seconds).toBeLessThanOrEqual(8);
    expect((await admin.rpc('finish_link_task', { ...args, attempt_uuid: started.data.attemptId })).data).toBe('failed');
    const retry = await admin.rpc('start_link_task', args);
    expect(retry.data.attemptId).not.toBe(started.data.attemptId);
    expect((await admin.rpc('finish_link_task', { ...args, attempt_uuid: started.data.attemptId })).error).not.toBeNull();
    expect((await admin.rpc('depart_link_task', { ...args, attempt_uuid: retry.data.attemptId })).error).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, retry.data.seconds * 1000 + 100));
    expect((await admin.rpc('finish_link_task', { ...args, attempt_uuid: retry.data.attemptId })).data).toBe('done');
    expect((await admin.rpc('issue_unlock', grant)).error).toBeNull();
    expect((await admin.rpc('consume_unlock', { ...grant, grant_hash: 'd'.repeat(64) })).error).not.toBeNull();
    expect((await admin.rpc('consume_unlock', { ...grant, link_uuid: crypto.randomUUID() })).error).not.toBeNull();
    expect((await admin.rpc('consume_unlock', { ...grant, visitor: 'b'.repeat(64) })).error).not.toBeNull();
    const consumed = await Promise.all([1, 2].map(() => admin.rpc('consume_unlock', grant)));
    expect(consumed.filter((r) => !r.error)).toHaveLength(1);
    expect(consumed.find((r) => !r.error)?.data).toBe(payload.destination);
    const events = await sessions[0].from('link_events').select('kind').eq('link_id', link);
    expect(events.data?.map((r) => r.kind).sort()).toEqual(['unlock', 'view']);
    expect((await admin.rpc('issue_unlock', grant)).error).toBeNull();
    expect((await admin.from('unlock_sessions').update({ token_expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', session)).error).toBeNull();
    expect((await admin.rpc('consume_unlock', grant)).error).not.toBeNull();
    expect((await admin.rpc('issue_unlock', grant)).error).toBeNull();
    expect((await sessions[0].rpc('save_link', { payload: { ...payload, enabled: false }, record_id: link, expected_revision: 1 })).error).toBeNull();
    expect((await admin.rpc('consume_unlock', grant)).error).not.toBeNull();
    expect((await sessions[1].rpc('delete_link', { record_id: link, expected_revision: 2 })).data).toBe(false);
    expect((await sessions[0].rpc('delete_link', { record_id: link, expected_revision: 2 })).data).toBe(true);
  } finally {
    for (const id of users) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Link fixture cleanup failed.');
  }
}, 60000);
