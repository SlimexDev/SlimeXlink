import { expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getTestConfig } from './setup';

it('keeps avatars private, denies client writes and swaps only once under concurrency', async () => {
  const config = getTestConfig();
  const secret = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Test admin key required.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(config.url, secret, options);
  const client = () => createClient(config.url, config.publishableKey, options);
  const users: string[] = [];
  const paths: string[] = [];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY4sAAAAASUVORK5CYII=', 'base64');
  try {
    const sessions = [];
    for (let i = 0; i < 2; i++) {
      const email = `avatar-${crypto.randomUUID()}@example.test`;
      const password = `Test-${crypto.randomUUID()}`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error('Avatar fixture failed.');
      users.push(created.data.user.id);
      const session = client();
      expect((await session.auth.signInWithPassword({ email, password })).error).toBeNull();
      sessions.push(session);
    }
    for (let i = 0; i < 2; i++) {
      const path = `${users[0]}/${crypto.randomUUID()}.png`;
      expect((await admin.storage.from('avatars').upload(path, png, { contentType: 'image/png' })).error).toBeNull();
      paths.push(path);
    }
    expect((await sessions[0].storage.from('avatars').createSignedUrl(paths[0], 60)).error).toBeNull();
    expect((await sessions[1].storage.from('avatars').createSignedUrl(paths[0], 60)).error).not.toBeNull();
    expect((await client().storage.from('avatars').download(paths[0])).error).not.toBeNull();
    expect((await sessions[0].storage.from('avatars').upload(`${users[0]}/${crypto.randomUUID()}.png`, png, { contentType: 'image/png' })).error).not.toBeNull();
    expect((await sessions[0].rpc('replace_avatar', { owner_id: users[0], previous_path: null, next_path: paths[0] })).error).not.toBeNull();
    const results = await Promise.all(paths.map((path) => admin.rpc('replace_avatar', { owner_id: users[0], previous_path: null, next_path: path })));
    expect(results.every((result) => result.error === null)).toBe(true);
    expect(results.filter((result) => result.data === true)).toHaveLength(1);
    const current = await admin.from('profiles').select('avatar_path').eq('id', users[0]).single();
    expect(paths).toContain(current.data?.avatar_path);
    expect((await admin.from('account_access').update({ status: 'suspended' }).eq('user_id', users[0])).error).toBeNull();
    expect((await sessions[0].storage.from('avatars').createSignedUrl(paths[0], 60)).error).not.toBeNull();
    expect((await admin.rpc('replace_avatar', { owner_id: users[0], previous_path: current.data?.avatar_path, next_path: paths.find((path) => path !== current.data?.avatar_path) })).data).toBe(false);
  } finally {
    if (paths.length && (await admin.storage.from('avatars').remove(paths)).error) throw new Error('Avatar file cleanup failed.');
    for (const id of users) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Avatar fixture cleanup failed.');
  }
}, 60000);
