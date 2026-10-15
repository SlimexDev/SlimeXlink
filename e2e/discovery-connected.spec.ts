import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';

test('discovery searches and paginates real listed links while the owner can page through all links', async ({ page }) => {
  test.setTimeout(60000);
  const env = parseEnv(readFileSync('.env.test.local', 'utf8'));
  const app = parseEnv(readFileSync('.env.local', 'utf8'));
  if (env.TEST_ALLOW_SUPABASE !== 'true' || env.TEST_SUPABASE_URL !== app.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Disposable test project required.');
  const admin = createClient(env.TEST_SUPABASE_URL!, env.TEST_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `discovery-${crypto.randomUUID()}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Fixture failed.');
  const prefix = `test-${crypto.randomUUID()}`;
  try {
    const rows = Array.from({ length: 24 }, (_, i) => ({ owner_id: created.data.user.id, slug: `${prefix}-${i}`, title: `[DEV TEST] ${prefix} ${String(i).padStart(2,'0')}`, listed: i !== 21, enabled: i !== 22, expires_at: i === 23 ? '2000-01-01T00:00:00Z' : null }));
    const saved = await admin.from('links').insert(rows).select('id');
    expect(saved.error).toBeNull();
    expect((await admin.from('link_targets').insert(saved.data!.map((row) => ({ link_id: row.id, url: 'https://example.com/development-content' })))).error).toBeNull();
    expect((await admin.from('link_tasks').insert(saved.data!.map((row) => ({ link_id: row.id, title: '[DEV TEST] Visit', url: 'https://example.org', position: 0 })))).error).toBeNull();
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/discover?q=${prefix}&sort=title`);
    await expect(page.getByRole('status').filter({ hasText: '21 kết quả' })).toBeVisible();
    await expect(page.locator('.link-list > li')).toHaveCount(12);
    await page.getByRole('link', { name: 'Trang sau', exact: true }).click();
    await expect(page.locator('.link-list > li')).toHaveCount(9);
    await expect(page).toHaveURL(/page=2/);
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/discover?q=${prefix}&category=expiring`);
    await expect(page.getByRole('status').filter({ hasText: '0 kết quả' })).toBeVisible();
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/login`);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(`${app.NEXT_PUBLIC_SITE_URL}/vi/dashboard`);
    await expect(page.locator('.link-list > li')).toHaveCount(20);
    await page.getByRole('link', { name: 'Sau', exact: true }).click();
    await expect(page.locator('.link-list > li')).toHaveCount(4);
    await page.goto(`${app.NEXT_PUBLIC_SITE_URL}/vi/admin`);
    await expect(page).toHaveURL(`${app.NEXT_PUBLIC_SITE_URL}/vi/dashboard`);
  } finally {
    if ((await admin.auth.admin.deleteUser(created.data.user.id)).error) throw new Error('Fixture cleanup failed.');
  }
});
