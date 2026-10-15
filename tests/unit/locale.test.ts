import { describe, expect, it } from 'vitest';
import { isLocale, resolveLocale, localizedPath } from '../../src/i18n/config';

describe('locale and safe navigation', () => {
  it('defaults to Vietnamese and only accepts supported locales', () => {
    expect(resolveLocale(undefined, undefined)).toBe('vi');
    expect(resolveLocale('vi', 'en')).toBe('vi');
    expect(resolveLocale(undefined, 'en')).toBe('en');
    expect(resolveLocale(undefined, 'fr')).toBe('vi');
    expect(isLocale('__proto__')).toBe(false);
  });
  it('keeps the route and allowed search parameters without copying credentials', () => {
    expect(localizedPath('/vi/explore', 'en', 'q=abc&page=2&code=secret&token=x')).toBe('/en/explore?q=abc&page=2');
    expect(localizedPath('/en', 'vi')).toBe('/vi');
    expect(localizedPath('//evil.example', 'en')).toBe('/en');
    expect(localizedPath('/auth/callback', 'vi', 'code=x')).toBe('/vi');
  });
});
