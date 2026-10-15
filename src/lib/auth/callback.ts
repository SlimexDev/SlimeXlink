import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { resolveLocale } from '../../i18n/config';
import { getPublicSupabaseConfig } from '../env/public';
import { siteOrigin } from './service';
import { createRecoveryToken, recoveryCookie, recoveryIdentitySchema, recoverySeconds } from './recovery-token';

export async function handleAuthCallback(request: NextRequest, kind: 'google' | 'confirm') {
  const locale = resolveLocale(request.nextUrl.searchParams.get('locale'), undefined);
  const response = NextResponse.redirect(new URL(`/${locale}/dashboard`, siteOrigin()));
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  let success = false;
  try {
    const config = getPublicSupabaseConfig();
    if (!config) throw new Error('UNCONFIGURED');
    const client = createServerClient(config.url, config.publishableKey, {
      cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    const code = request.nextUrl.searchParams.get('code');
    if (code) {
      if (code.length > 2048) throw new Error('INVALID_CALLBACK');
      let recovery = false;
      const { data: { subscription } } = client.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') recovery = true; });
      try {
        const result = await client.auth.exchangeCodeForSession(code);
        success = !result.error;
      } finally { subscription.unsubscribe(); }
      if (success && recovery) {
        const claims = await client.auth.getClaims();
        if (claims.error || !claims.data) throw new Error('INVALID_RECOVERY_SESSION');
        const identity = recoveryIdentitySchema.parse({ userId: claims.data.claims.sub, sessionId: claims.data.claims.session_id });
        response.cookies.set(recoveryCookie, createRecoveryToken(identity, process.env.AUTH_RATE_LIMIT_SECRET ?? ''), {
          httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: recoverySeconds,
        });
        response.headers.set('Location', new URL(`/${locale}/reset-password`, siteOrigin()).toString());
      }
    } else {
        if (kind !== 'confirm') throw new Error('INVALID_CALLBACK');
        const token = request.nextUrl.searchParams.get('token_hash');
        const type = request.nextUrl.searchParams.get('type');
        if (!token || token.length > 2048 || type !== 'email') throw new Error('INVALID_CALLBACK');
        const result = await client.auth.verifyOtp({ token_hash: token, type: 'email' });
        success = !result.error;
    }
  } catch { success = false; }
  if (!success) response.headers.set('Location', new URL(`/${locale}/login?error=AUTH_LINK_INVALID`, siteOrigin()).toString());
  return response;
}
