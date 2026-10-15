import { expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import { copySessionResponse } from '../../src/lib/supabase/session-response';

it('keeps refreshed cookies and cache headers when replacing a response with a redirect', () => {
  const refreshed = NextResponse.next();
  refreshed.cookies.set('sb-project-auth-token', 'test-session', { httpOnly: true, sameSite: 'lax', secure: true });
  refreshed.headers.set('Cache-Control', 'private, no-store');
  refreshed.headers.set('Pragma', 'no-cache');
  refreshed.headers.set('Expires', '0');
  const redirect = NextResponse.redirect('https://slimexlink.example/en');
  copySessionResponse(refreshed, redirect);
  expect(redirect.cookies.get('sb-project-auth-token')?.value).toBe('test-session');
  expect(redirect.headers.get('set-cookie')).toContain('HttpOnly');
  expect(redirect.headers.get('cache-control')).toBe('private, no-store');
  expect(redirect.headers.get('pragma')).toBe('no-cache');
  expect(redirect.headers.get('expires')).toBe('0');
  expect(redirect.headers.get('location')).toBe('https://slimexlink.example/en');
});
