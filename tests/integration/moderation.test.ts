import { expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getTestConfig } from './setup';

it('checks admin permissions in RLS and RPC, audits changes and excludes suspended owners from discovery', async () => {
  const config = getTestConfig();
  const secret = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Admin test key required.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(config.url, secret, options);
  const ids: string[] = [];
  try {
    const sessions = [];
    for (let i = 0; i < 2; i++) {
      const email = `moderation-${crypto.randomUUID()}@example.test`;
      const password = `Test-${crypto.randomUUID()}`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error('Fixture failed.');
      ids.push(created.data.user.id);
      const client = createClient(config.url, config.publishableKey, options);
      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
      sessions.push(client);
    }
    const payload = { title: 'Moderation test', slug: `moderation-${crypto.randomUUID()}`, destination: 'https://example.com', listed: true, tasks: [{ title: 'Visit', url: 'https://example.org' }] };
    const saved = await sessions[0].rpc('save_link', { payload });
    expect(saved.error).toBeNull();
    const args = { operation: 'link', record_id: saved.data, enabled_value: false, explanation: 'Controlled moderation test' };
    expect((await sessions[0].rpc('moderate_record', args)).error).not.toBeNull();
    expect((await sessions[0].from('admin_audit').select('*')).data).toEqual([]);
    expect((await sessions[0].from('admin_directory').select('*')).data).toEqual([]);
    expect((await sessions[0].from('discoverable_links').select('*')).error).not.toBeNull();
    expect((await admin.from('account_access').update({ role: 'admin' }).eq('user_id', ids[1])).error).toBeNull();
    expect((await sessions[1].from('admin_directory').select('id').in('id', ids)).data).toHaveLength(2);
    expect((await sessions[1].rpc('moderate_record', args)).error).toBeNull();
    expect((await sessions[1].from('admin_audit').select('action').eq('target_id', saved.data)).data).toEqual([{ action: 'link:disable' }]);
    expect((await admin.from('discoverable_links').select('id').eq('id', saved.data)).data).toEqual([]);
    expect((await sessions[1].rpc('moderate_record', { ...args, enabled_value: true })).error).toBeNull();
    expect((await admin.from('discoverable_links').select('id').eq('id', saved.data)).data).toHaveLength(1);
    expect((await sessions[1].rpc('moderate_record', { ...args, operation: 'account', record_id: ids[0] })).error).toBeNull();
    expect((await sessions[0].from('link_targets').select('*').eq('link_id', saved.data)).data).toEqual([]);
    expect((await admin.from('discoverable_links').select('id').eq('id', saved.data)).data).toEqual([]);
    expect((await sessions[0].rpc('save_link', { payload })).error).not.toBeNull();
    expect((await sessions[1].rpc('moderate_record', { ...args, operation: 'account', record_id: ids[1] })).error).not.toBeNull();
  } finally {
    if (ids.length) {
      if ((await admin.from('admin_audit').delete().in('actor_id', ids)).error) throw new Error('Audit fixture cleanup failed.');
      for (const id of ids) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Fixture cleanup failed.');
    }
  }
}, 60000);
