import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/auth/service';
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/vi/dashboard', '/en/dashboard', '/vi/admin', '/en/admin', '/vi/settings', '/en/settings', '/vi/login', '/en/login', '/vi/reset-password', '/en/reset-password'] }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
