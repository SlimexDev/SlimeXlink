import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ event: 'SIGNED_IN', notify: undefined as ((event: string) => void) | undefined, exchange: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/auth/service', () => ({ siteOrigin: () => 'http://localhost:3000' }));
vi.mock('../../src/lib/env/public', () => ({ getPublicSupabaseConfig: () => ({ url: 'https://test.supabase.co', publishableKey: 'test' }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: {
  onAuthStateChange: (callback: (event: string) => void) => { mocks.notify = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  exchangeCodeForSession: async (code: string) => { mocks.notify?.(mocks.event); return mocks.exchange(code); },
  getClaims: async () => ({ data: { claims: { sub: '4b8a7e40-d9c3-4af4-82d2-3e3514d86b08', session_id: 'd78195d5-3256-4314-8681-279caf72a690' } }, error: null }),
} }) }));
import { handleAuthCallback } from '../../src/lib/auth/callback';
beforeEach(() => { vi.stubEnv('AUTH_RATE_LIMIT_SECRET', 'test-secret-at-least-thirty-two-characters'); mocks.event = 'SIGNED_IN'; mocks.exchange.mockResolvedValue({ error: null }); });
it('only issues a recovery cookie after the authenticated PASSWORD_RECOVERY event', async () => {
  const normal = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=code&type=recovery'), 'google');
  expect(normal.cookies.has('slimex_recovery')).toBe(false);
  expect(new URL(normal.headers.get('location')!).pathname).toBe('/vi/dashboard');
  mocks.event = 'PASSWORD_RECOVERY';
  const recovery = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=code&locale=en'), 'google');
  expect(recovery.cookies.get('slimex_recovery')?.httpOnly).toBe(true);
  expect(new URL(recovery.headers.get('location')!).pathname).toBe('/en/reset-password');
});
it('does not grant recovery when code exchange fails', async () => {
  mocks.event = 'PASSWORD_RECOVERY';
  mocks.exchange.mockResolvedValueOnce({ error: { code: 'invalid' } });
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?code=invalid'), 'google');
  expect(response.cookies.has('slimex_recovery')).toBe(false);
  expect(new URL(response.headers.get('location')!).pathname).toBe('/vi/login');
});
