import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/auth/service';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return ['vi','en'].flatMap((locale) => ['', '/discover', '/guide', '/contact', '/privacy', '/terms', '/acceptable-use'].map((path) => ({ url: `${origin}/${locale}${path}`, alternates: { languages: { vi: `${origin}/vi${path}`, en: `${origin}/en${path}` } } })));
}
