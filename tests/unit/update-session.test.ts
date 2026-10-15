import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { updateSession } from '../../src/lib/supabase/update-session';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('session refresh adapter', () => {
  it('does not contact Auth for an anonymous page or missing configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    expect((await updateSession(new NextRequest('https://slimexlink.example/vi'))).status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });
  it('writes refreshed cookies into both downstream request and browser response', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    const user = vi.fn();
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      user.mockImplementation(async () => {
        options.cookies.setAll?.([{ name: 'sb-test-auth-token', value: 'refreshed', options: { httpOnly: true, sameSite: 'lax' } }], { 'Cache-Control': 'private, no-store', Pragma: 'no-cache' });
        return { data: { user: { id: 'test' } }, error: null };
      });
      return { auth: { getUser: user } } as ReturnType<typeof createServerClient>;
    });
    const request = new NextRequest('https://slimexlink.example/en', { headers: { Cookie: 'sb-test-auth-token=old' } });
    const response = await updateSession(request);
    expect(user).toHaveBeenCalledOnce();
    expect(request.cookies.get('sb-test-auth-token')?.value).toBe('refreshed');
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('refreshed');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('clears a revoked session from the downstream request and browser response', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => ({ auth: { getUser: async () => {
      options.cookies.setAll?.([{ name: 'sb-test-auth-token', value: '', options: { maxAge: 0 } }], {});
      return { data: { user: null }, error: { code: 'session_not_found' } };
    } } }) as ReturnType<typeof createServerClient>);
    const request = new NextRequest('https://slimexlink.example/vi/reset-password', { headers: { Cookie: 'sb-test-auth-token=revoked' } });
    const response = await updateSession(request);
    expect(request.cookies.get('sb-test-auth-token')?.value).toBe('');
    expect(response.cookies.get('sb-test-auth-token')?.maxAge).toBe(0);
  });
});
