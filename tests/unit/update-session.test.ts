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
    const claims = vi.fn();
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      claims.mockImplementation(async () => {
        options.cookies.setAll?.([{ name: 'sb-test-auth-token', value: 'refreshed', options: { httpOnly: true, sameSite: 'lax' } }], { 'Cache-Control': 'private, no-store', Pragma: 'no-cache' });
        return { data: { claims: { sub: 'test' } }, error: null };
      });
      return { auth: { getClaims: claims } } as ReturnType<typeof createServerClient>;
    });
    const request = new NextRequest('https://slimexlink.example/en', { headers: { Cookie: 'sb-test-auth-token=old' } });
    const response = await updateSession(request);
    expect(claims).toHaveBeenCalledOnce();
    expect(request.cookies.get('sb-test-auth-token')?.value).toBe('refreshed');
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('refreshed');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
