import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const localEnv = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {};
const googleEnabled = (process.env.AUTH_GOOGLE_ENABLED ?? localEnv.AUTH_GOOGLE_ENABLED) === 'true';

for (const locale of ['vi', 'en']) {
  test(`${locale}: guest dashboard is protected and login form is accessible`, async ({ page }) => {
    await page.goto(`/${locale}/dashboard`);
    await expect(page).toHaveURL(`/${locale}/login`);
    await expect(page.locator('input[name=email]')).toHaveAttribute('type', 'email');
    await expect(page.locator('input[name=password]')).toHaveAttribute('type', 'password');
    await expect(page.locator('input[name=token]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: locale === 'vi' ? 'Gửi mã' : 'Send code', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: locale === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google' })).toBeEnabled({ enabled: googleEnabled });
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.goto(`/${locale}/register`);
    await expect(page.locator('input[name=password]')).toHaveAttribute('minlength', '12');
    await expect(page.locator('input[name=displayName]')).toHaveAttribute('maxlength', '80');
    await expect(page.locator('input[name=token]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: locale === 'vi' ? 'Tạo tài khoản' : 'Create account', exact: true })).toBeVisible();
    await page.getByRole('link', { name: locale === 'vi' ? 'Gửi lại email xác nhận' : 'Resend confirmation email' }).click();
    await expect(page).toHaveURL(`/${locale}/confirm-email`);
    await expect(page.locator('input[name=email]')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('input[name=password]')).toHaveCount(0);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

test('Google callback without a code returns a safe error without losing the locale', async ({ request }) => {
  const response = await request.get('/auth/callback?locale=en&next=https://evil.example', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const target = new URL(response.headers().location);
  expect(target.pathname).toBe('/en/login');
  expect(target.hostname).not.toBe('evil.example');
  expect(response.headers()['referrer-policy']).toBe('no-referrer');
});

for (const width of [390, 1440]) {
  test(`registration form with default email link at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vi/register');
    await expect(page.locator('input[name=token]')).toHaveCount(0);
    await page.getByLabel('Email', { exact: true }).fill('test@example.test');
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    expect(await page.getByLabel('Tên hiển thị', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/register-link-${width}.png`, fullPage: true });
  });
}

test('confirmation callback rejects missing credentials without granting a session', async ({ request }) => {
  const response = await request.get('/auth/confirm?locale=vi', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).pathname).toBe('/vi/login');
});
