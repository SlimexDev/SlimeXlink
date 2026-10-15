import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

for (const locale of ['vi', 'en']) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`${locale} at ${width}px has no overflow, console errors or accessibility violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 640 ? 844 : 900 });
      const failures: string[] = [];
      page.on('pageerror', (error) => failures.push(error.message));
      page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) failures.push(message.text()); });
      page.on('requestfailed', (request) => failures.push(`${request.method()} ${request.url()}`));
      page.on('response', (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()} ${response.url()}`); });
      await page.goto(`/${locale}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('combobox')).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(scan.violations).toEqual([]);
      expect(failures).toEqual([]);
      if (width === 390 || width === 1440) {
        await mkdir('docs/screenshots', { recursive: true });
        await page.screenshot({ path: `docs/screenshots/platform-${locale}-${width}.png`, fullPage: true });
      }
    });
  }
}
