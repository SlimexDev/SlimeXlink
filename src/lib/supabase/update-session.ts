import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseConfig } from '../env/public';
import { logEvent } from '../logger';
import { copySessionResponse } from './session-response';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const started = performance.now();
  const requestId = crypto.randomUUID();
  let config;
  try { config = getPublicSupabaseConfig(); } catch {
    logEvent({ event: 'supabase_configuration_invalid', requestId, status: 503, durationMs: 0 });
    return response;
  }
  if (!config || !request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))) return response;
  const client = createServerClient(config.url, config.publishableKey, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        const previous = response;
        response = NextResponse.next({ request });
        copySessionResponse(previous, response);
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  try { await client.auth.getClaims(); } catch {
    logEvent({ event: 'auth_refresh_unavailable', requestId, status: 503, durationMs: Math.round(performance.now() - started) });
  }
  return response;
}
