import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';

test('reports persist and an administrator resolves them with an audit entry', async ({ page }) => {
  const env = parseEnv(readFileSync('.env.test.local', 'utf8'));
  const app = parseEnv(readFileSync('.env.local', 'utf8'));
  if (env.TEST_ALLOW_SUPABASE !== 'true' || env.TEST_SUPABASE_URL !== app.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Disposable test project required.');
  const admin = createClient(env.TEST_SUPABASE_URL!, env.TEST_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `admin-ui-${crypto.randomUUID()}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;
  const slug = `report-${crypto.randomUUID()}`;
  const contactName = `Contact-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Admin fixture failed.');
  const id = created.data.user.id;
  try {
    expect((await admin.from('account_access').update({ role: 'admin' }).eq('user_id', id)).error).toBeNull();
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/contact`);
    await page.getByLabel('Tên', { exact: true }).fill(contactName);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Nội dung (10–2000 ký tự)').fill('Controlled contact message for administrator review.');
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Đã ghi nhận' })).toBeVisible();
    expect((await admin.from('contact_messages').select('id').eq('email', email)).data).toHaveLength(1);
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/report?slug=${slug}`);
    await page.getByLabel('Nội dung (10–2000 ký tự)').fill('Controlled report submitted by automated test.');
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Đã ghi nhận' })).toBeVisible();
    const report = await admin.from('reports').select('id').eq('slug', slug).single();
    expect(report.error).toBeNull();
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/login`);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(`${app.NEXT_PUBLIC_SITE_URL}/vi/dashboard`);
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/admin?section=reports&q=${slug}&filter=open`);
    await page.getByLabel('Lý do quản trị', { exact: true }).fill('Reviewed controlled test report.');
    await page.getByRole('button', { name: 'Đánh dấu đã xử lý', exact: true }).click();
    await expect.poll(async () => (await admin.from('reports').select('status').eq('id', report.data!.id).single()).data?.status).toBe('resolved');
    expect((await admin.from('admin_audit').select('id').eq('actor_id', id).eq('target_id', report.data!.id)).data).toHaveLength(1);
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/admin?section=contacts&q=${contactName}`);
    await expect(page.getByText('Controlled contact message for administrator review.', { exact: false })).toBeVisible();
  } finally {
    if ((await admin.from('reports').delete().eq('slug', slug)).error) throw new Error('Report cleanup failed.');
    if ((await admin.from('admin_audit').delete().eq('actor_id', id)).error) throw new Error('Audit cleanup failed.');
    if ((await admin.from('contact_messages').delete().eq('email', email)).error) throw new Error('Contact cleanup failed.');
    if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Admin fixture cleanup failed.');
  }
});
