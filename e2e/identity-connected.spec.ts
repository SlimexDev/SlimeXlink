import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { createRecoveryToken } from '../src/lib/auth/recovery-token';

test('real Supabase login, profile update and logout with a disposable confirmed account', async ({ page }) => {
  const env = parseEnv(readFileSync('.env.test.local', 'utf8'));
  const app = parseEnv(readFileSync('.env.local', 'utf8'));
  if (env.TEST_ALLOW_SUPABASE !== 'true' || !env.TEST_SUPABASE_SERVICE_ROLE_KEY || !env.TEST_SUPABASE_URL || !app.NEXT_PUBLIC_SITE_URL) throw new Error('Confirmed disposable test project, site URL and server key are required.');
  const admin = createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `slimex-browser-${crypto.randomUUID()}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Test user provisioning failed.');
  try {
    const origin = new URL(app.NEXT_PUBLIC_SITE_URL);
    if (!['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Browser Auth test must target localhost.');
    await page.goto(`${origin.origin}/vi/login`);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(`${origin.origin}/vi/dashboard`);
    await expect(page.getByText('Vai trò: Người dùng', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Hồ sơ', exact: true }).click();
    await page.getByLabel('Tên hiển thị').fill('Browser test name');
    await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Đã lưu hồ sơ.' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Browser test name');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY4sAAAAASUVORK5CYII=', 'base64');
    await page.getByLabel('Ảnh đại diện', { exact: true }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Cập nhật ảnh' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Đã cập nhật ảnh đại diện.' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Ảnh đại diện' })).toBeVisible();
    await expect.poll(() => page.getByRole('img', { name: 'Ảnh đại diện' }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const previous = await admin.from('profiles').select('avatar_path').eq('id', created.data.user.id).single();
    await page.getByLabel('Ảnh đại diện', { exact: true }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Cập nhật ảnh' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Đã cập nhật ảnh đại diện.' })).toBeVisible();
    await expect.poll(async () => (await admin.from('profiles').select('avatar_path').eq('id', created.data.user.id).single()).data?.avatar_path).not.toBe(previous.data?.avatar_path);
    expect((await admin.storage.from('avatars').download(previous.data!.avatar_path)).error).not.toBeNull();
    await page.reload();
    await expect(page.getByRole('img', { name: 'Ảnh đại diện' })).toBeVisible();
    await page.goto(`${origin.origin}/vi/dashboard`);
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(`${origin.origin}/vi/login`);
    await page.goto(`${origin.origin}/vi/dashboard`);
    await expect(page).toHaveURL(`${origin.origin}/vi/login`);
  } finally {
    const stored = await admin.storage.from('avatars').list(created.data.user.id);
    if (stored.error) throw new Error('Avatar cleanup listing failed.');
    if (stored.data.length && (await admin.storage.from('avatars').remove(stored.data.map((file) => `${created.data.user.id}/${file.name}`))).error) throw new Error('Avatar cleanup failed.');
    const deleted = await admin.auth.admin.deleteUser(created.data.user.id);
    if (deleted.error) throw new Error('Test user cleanup failed.');
  }
});

test('controlled recovery session changes a password through the app and rejects replay', async ({ page, context }) => {
  const env = parseEnv(readFileSync('.env.test.local', 'utf8'));
  const app = parseEnv(readFileSync('.env.local', 'utf8'));
  if (env.TEST_ALLOW_SUPABASE !== 'true' || !env.TEST_SUPABASE_SERVICE_ROLE_KEY || !env.TEST_SUPABASE_URL || !env.TEST_SUPABASE_PUBLISHABLE_KEY || !app.NEXT_PUBLIC_SITE_URL || !app.AUTH_RATE_LIMIT_SECRET) throw new Error('Disposable test project and recovery configuration are required.');
  if (env.TEST_SUPABASE_URL !== app.NEXT_PUBLIC_SUPABASE_URL) throw new Error('App and disposable test project must match.');
  const origin = new URL(app.NEXT_PUBLIC_SITE_URL);
  if (!['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Recovery browser test must target localhost.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_SERVICE_ROLE_KEY, options);
  const email = `recovery-browser-${crypto.randomUUID()}@example.test`;
  const oldPassword = `Old-${crypto.randomUUID()}`;
  const password = `New-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password: oldPassword, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Recovery fixture failed.');
  try {
    const generated = await admin.auth.admin.generateLink({ type: 'recovery', email });
    if (generated.error) throw new Error('Controlled recovery link generation failed.');
    const recovered = createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_PUBLISHABLE_KEY, options);
    const verified = await recovered.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: 'recovery' });
    if (verified.error || !verified.data.session) throw new Error('Recovery fixture verification failed.');
    const jar = new Map<string, string>();
    const ssr = createServerClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_PUBLISHABLE_KEY, { cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => { if (value) jar.set(name, value); else jar.delete(name); }),
    } });
    if ((await ssr.auth.setSession(verified.data.session)).error) throw new Error('Session fixture failed.');
    const claims = await recovered.auth.getClaims();
    const sessionId = claims.data?.claims.session_id;
    if (typeof sessionId !== 'string') throw new Error('Recovery session claim missing.');
    const grant = createRecoveryToken({ userId: created.data.user.id, sessionId }, app.AUTH_RATE_LIMIT_SECRET);
    const initialCookies = [...Array.from(jar, ([name, value]) => ({ name, value })), { name: 'slimex_recovery', value: grant }].map((cookie) => ({ ...cookie, domain: origin.hostname, path: '/', httpOnly: true, sameSite: 'Lax' as const, secure: true }));
    await context.addCookies(initialCookies);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin.origin}/vi/reset-password`);
    await expect(page.getByLabel('Nhập lại mật khẩu mới')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/reset-password-1440.png', fullPage: true });
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByLabel('Nhập lại mật khẩu mới').fill(password);
    await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await expect(page).toHaveURL(`${origin.origin}/vi/login?notice=PASSWORD_CHANGED`);
    await expect(page.getByRole('status').filter({ hasText: 'Đã đổi mật khẩu' })).toBeVisible();
    const client = createClient(env.TEST_SUPABASE_URL, env.TEST_SUPABASE_PUBLISHABLE_KEY, options);
    expect((await client.auth.signInWithPassword({ email, password: oldPassword })).error).not.toBeNull();
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    await context.addCookies(initialCookies);
    await page.goto(`${origin.origin}/vi/reset-password`);
    const confirmation = page.getByLabel('Nhập lại mật khẩu mới');
    if (await confirmation.count()) {
      const field = page.getByLabel('Mật khẩu', { exact: true });
      await field.fill(`Replay-${crypto.randomUUID()}`);
      await page.getByLabel('Nhập lại mật khẩu mới').fill(await field.inputValue());
      await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'không hợp lệ hoặc đã hết hạn' })).toBeVisible();
    } else {
      await expect(page).toHaveURL(`${origin.origin}/vi/login`);
    }
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
  } finally {
    if ((await admin.auth.admin.deleteUser(created.data.user.id)).error) throw new Error('Recovery fixture cleanup failed.');
  }
});
