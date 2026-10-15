import { expect, it } from 'vitest';
import { localeRedirect } from '../../src/i18n/routing';

it('redirects only the bare root, preserving the user choice', () => {
  expect(localeRedirect('/', 'en')).toBe('/en');
  expect(localeRedirect('/', 'invalid')).toBe('/vi');
  for (const path of ['/vi', '/en', '/fr', '/api/health', '/auth/callback', '/_next/a.js']) {
    expect(localeRedirect(path, 'en')).toBeNull();
  }
});
