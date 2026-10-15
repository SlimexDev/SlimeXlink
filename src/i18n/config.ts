export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return value === 'vi' || value === 'en';
}

export function resolveLocale(pathLocale: unknown, preference: unknown): Locale {
  return isLocale(pathLocale) ? pathLocale : isLocale(preference) ? preference : 'vi';
}

export function localizedPath(pathname: string, locale: Locale, search = ''): string {
  const segments = pathname.split('/');
  if (!isLocale(segments[1]) || pathname.includes('\\')) return `/${locale}`;
  segments[1] = locale;
  const query = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) {
    if (['q', 'page', 'sort', 'category'].includes(key)) query.append(key, value);
  }
  return segments.join('/') + (query.size ? `?${query}` : '');
}
