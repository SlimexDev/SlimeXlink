'use client';

import { usePathname } from 'next/navigation';
import { isLocale, localizedPath, type Locale } from '@/i18n/config';

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  return <label className="language-control">
    <span className="sr-only">{label}</span>
    <span aria-hidden="true">◎</span>
    <select value={locale} onChange={(event) => {
      const selected = event.target.value;
      if (!isLocale(selected)) return;
      document.cookie = `slimex_locale=${selected}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
      window.location.assign(localizedPath(pathname, selected, window.location.search) + window.location.hash);
    }}>
      <option value="vi" lang="vi">Tiếng Việt</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
