import { NextResponse, type NextRequest } from 'next/server';
import { localeRedirect } from './i18n/routing';
import { contentSecurityPolicy } from './lib/security';
import { getPublicSupabaseConfig } from './lib/env/public';
import { updateSession } from './lib/supabase/update-session';
import { copySessionResponse } from './lib/supabase/session-response';

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  let supabaseOrigin: string | undefined;
  try { supabaseOrigin = getPublicSupabaseConfig()?.url; } catch { /* The session adapter logs configuration errors without values. */ }
  const policy = contentSecurityPolicy(nonce, supabaseOrigin, process.env.NODE_ENV === 'development');
  request.headers.set('Content-Security-Policy', policy);
  request.headers.set('x-nonce', nonce);
  let response = await updateSession(request);
  const destination = localeRedirect(request.nextUrl.pathname, request.cookies.get('slimex_locale')?.value);
  if (destination) {
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    copySessionResponse(response, redirect);
    response = redirect;
  }
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/((?!api/health|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'] };
