import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public content, discovery and draft policies are accessible in both languages', async ({ page, request }) => {
  for (const locale of ['vi','en']) {
    for (const path of ['discover','guide','contact','report','privacy','terms','acceptable-use']) {
      await page.goto(`/${locale}/${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    }
    await page.goto(`/${locale}/discover?q=nonexistent-${crypto.randomUUID()}&sort=title&category=expiring&page=2`);
    await expect(page.getByRole('status').filter({ hasText: '0' })).toBeVisible();
  }
  expect((await request.get('/api/maintenance')).status()).toBe(401);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain('/vi/dashboard');
});
