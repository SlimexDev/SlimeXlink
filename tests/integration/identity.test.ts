import { expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getTestConfig } from './setup';

it('enforces profile ownership, server-owned roles and suspension through the real Data API', async () => {
  const config = getTestConfig();
  const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Integration blocked: TEST_SUPABASE_SERVICE_ROLE_KEY required on disposable test project.');
  const admin = createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const password = `Test-${crypto.randomUUID()}`;
  const users: string[] = [];
  const client = () => createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const accounts = [];
    for (const label of ['a', 'b']) {
      const email = `slimex-${label}-${crypto.randomUUID()}@example.test`;
      const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'admin', status: 'active', display_name: label } });
      if (result.error || !result.data.user) throw new Error('Test user provisioning failed; check test schema and Auth configuration.');
      users.push(result.data.user.id);
      const session = client();
      expect((await session.auth.signInWithPassword({ email, password })).error).toBeNull();
      accounts.push({ id: result.data.user.id, session });
    }
    const [a, b] = accounts;
    const ownAccess = await a.session.from('account_access').select('role,status').eq('user_id', a.id).single();
    expect(ownAccess.error).toBeNull();
    expect(ownAccess.data?.role).toBe('member');
    expect((await a.session.from('profiles').select('id').eq('id', b.id)).data).toEqual([]);
    expect((await client().from('profiles').select('id')).data ?? []).toEqual([]);
    expect((await a.session.from('profiles').update({ display_name: 'forged' }).eq('id', b.id).select('id')).data).toEqual([]);
    expect((await a.session.from('account_access').update({ role: 'admin' }).eq('user_id', a.id)).error).not.toBeNull();
    expect((await a.session.from('profiles').update({ display_name: 'Changed' }).eq('id', a.id).select('display_name').single()).data?.display_name).toBe('Changed');
    expect((await admin.from('account_access').update({ status: 'suspended' }).eq('user_id', a.id)).error).toBeNull();
    expect((await a.session.from('profiles').select('id').eq('id', a.id)).data).toEqual([]);
    expect((await a.session.from('profiles').update({ display_name: 'bypass' }).eq('id', a.id).select('id')).data).toEqual([]);
  } finally {
    for (const id of users) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error) throw new Error('Test user cleanup failed; inspect disposable test project.');
    }
  }
}, 60000);

it('enforces atomic shared rate limits and denies guest RPC access', async () => {
  const config = getTestConfig();
  const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('TEST_SUPABASE_SERVICE_ROLE_KEY required.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(config.url, key, options);
  const guest = createClient(config.url, config.publishableKey, options);
  const bucket = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const args = { bucket_key: bucket, max_attempts: 3, window_seconds: 60 };
  expect((await guest.rpc('consume_auth_limit', args)).error).not.toBeNull();
  const results = await Promise.all(Array.from({ length: 10 }, () => admin.rpc('consume_auth_limit', args)));
  expect(results.every((result) => result.error === null)).toBe(true);
  expect(results.filter((result) => result.data === true)).toHaveLength(3);
  const recoveryBucket = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const resets = await Promise.all(Array.from({ length: 8 }, () => admin.rpc('consume_auth_limit', { bucket_key: recoveryBucket, max_attempts: 1, window_seconds: 900 })));
  expect(resets.every((result) => result.error === null)).toBe(true);
  expect(resets.filter((result) => result.data === true)).toHaveLength(1);
});

it('confirms the default signup link using real Auth and rejects reuse without sending email', async () => {
  const config = getTestConfig();
  const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Test admin key required.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(config.url, key, options);
  const email = `confirmation-${crypto.randomUUID()}@example.test`;
  const generated = await admin.auth.admin.generateLink({ type: 'signup', email, password: `Test-${crypto.randomUUID()}`, options: { redirectTo: 'http://localhost:3000/auth/callback?locale=vi' } });
  if (generated.error || !generated.data.user) throw new Error('Controlled signup code fixture failed.');
  try {
    const link = generated.data.properties.action_link;
    const verified = await fetch(link, { redirect: 'manual' });
    expect([302, 303, 307]).toContain(verified.status);
    expect(new URL(verified.headers.get('location') ?? '').pathname).toBe('/auth/callback');
    expect((await admin.auth.admin.getUserById(generated.data.user.id)).data.user?.email_confirmed_at).toBeTruthy();
    const repeated = await fetch(link, { redirect: 'manual' });
    expect(repeated.headers.get('location')).toContain('error');
  } finally {
    if ((await admin.auth.admin.deleteUser(generated.data.user.id)).error) throw new Error('Confirmation fixture cleanup failed.');
  }
}, 30000);
