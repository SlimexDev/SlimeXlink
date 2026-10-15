import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['vi', 'en']) {
  test(`${locale}: recovery request is accessible and a forged reset URL does not grant access`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/login`);
    await page.getByRole('link', { name: locale === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?' }).click();
    await expect(page).toHaveURL(`/${locale}/forgot-password`);
    await expect(page.locator('input[name=email]')).toHaveAttribute('type', 'email');
    await page.getByLabel('Email', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: locale === 'vi' ? 'Gửi liên kết đặt lại' : 'Send reset link' })).toBeFocused();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/forgot-password-${locale}-390.png`, fullPage: true });
    await page.goto(`/${locale}/reset-password?type=recovery&verified=true`);
    await expect(page.locator('input[name=password]')).toHaveCount(0);
    await expect(page.locator('main [role=alert]')).toBeVisible();
  });
}
