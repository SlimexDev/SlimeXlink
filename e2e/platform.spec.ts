import { expect, test } from '@playwright/test';

test('defaults to Vietnamese, switches locale and remembers the selection', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/vi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.goto('/vi?q=hello&page=2&code=must-not-follow');
  await page.getByLabel('Ngôn ngữ').selectOption('en');
  await expect(page).toHaveURL('/en?q=hello&page=2');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Share with less friction.');
  await page.reload();
  await expect(page.getByLabel('Language')).toHaveValue('en');
  await page.goto('/');
  await expect(page).toHaveURL('/en');
  await page.goto('/vi');
  await expect(page.getByLabel('Ngôn ngữ')).toHaveValue('vi');
});

test('health is live without exposing backend configuration', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'ok' });
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test('pages have unique CSP nonces and do not cache sessions', async ({ request }) => {
  const first = await request.get('/vi');
  const second = await request.get('/vi');
  const csp = first.headers()['content-security-policy'];
  expect(csp).toContain('nonce-');
  expect(csp).not.toContain('unsafe-inline');
  expect(second.headers()['content-security-policy']).not.toBe(csp);
  expect(first.headers()['cache-control']).toContain('no-store');
  expect(first.headers()['x-frame-options']).toBe('DENY');
});

test('unsupported locales and unknown paths are 404', async ({ request, page }) => {
  expect((await request.get('/fr')).status()).toBe(404);
  expect((await request.get('/en/does-not-exist')).status()).toBe(404);
  await page.goto('/en/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/en');
});

test('keyboard reaches skip link and language control with visible focus', async ({ page }) => {
  await page.goto('/vi');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.getByLabel('Ngôn ngữ').focus();
  const style = await page.getByLabel('Ngôn ngữ').evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(style).not.toBe('none');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
