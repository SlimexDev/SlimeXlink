import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resend: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), limit: vi.fn() }));
vi.mock('../../src/lib/auth/service', () => ({ consumeAuthLimit: mocks.limit, siteOrigin: () => 'http://localhost:3000' }));
vi.mock('../../src/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { resend: mocks.resend, signUp: mocks.signUp, signOut: mocks.signOut } }) }));
vi.mock('../../src/lib/auth/guards', () => ({ requireActor: vi.fn() }));
import { register, resendConfirmation } from '../../src/lib/auth/actions';

beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue(true); mocks.resend.mockResolvedValue({ error: null }); mocks.signUp.mockResolvedValue({ error: null }); });
const form = (email: string) => { const value = new FormData(); value.set('email', email); return value; };
it('rejects invalid email before contacting the provider', async () => {
  expect(await resendConfirmation('vi', {}, form('invalid'))).toEqual({ code: 'INVALID_INPUT' });
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(mocks.resend).not.toHaveBeenCalled();
});
it('limits email requests and fails closed when the limiter fails', async () => {
  mocks.limit.mockResolvedValueOnce(false);
  expect(await resendConfirmation('en', {}, form('test@example.com'))).toEqual({ code: 'RATE_LIMITED' });
  mocks.limit.mockRejectedValueOnce(new Error('offline'));
  expect(await resendConfirmation('en', {}, form('test@example.com'))).toEqual({ code: 'SERVICE_UNAVAILABLE' });
  expect(mocks.resend).not.toHaveBeenCalled();
});
it('uses the configured callback and gives the same answer for unknown or confirmed emails', async () => {
  expect(await resendConfirmation('en', {}, form(' test@example.com '))).toEqual({ code: 'CONFIRMATION_REQUESTED' });
  expect(mocks.resend).toHaveBeenCalledWith({ type: 'signup', email: 'test@example.com', options: { emailRedirectTo: 'http://localhost:3000/auth/callback?locale=en' } });
  mocks.resend.mockResolvedValueOnce({ error: { code: 'user_not_found' } });
  expect(await resendConfirmation('en', {}, form('unknown@example.com'))).toEqual({ code: 'CONFIRMATION_REQUESTED' });
});

it('registers with the default confirmation link and preserves the PKCE verifier', async () => {
  const value = form('new@example.com');
  value.set('password', 'a-long-password');
  value.set('displayName', 'New member');
  expect(await register('vi', {}, value)).toEqual({ code: 'EMAIL_SENT' });
  expect(mocks.signUp).toHaveBeenCalledWith({
    email: 'new@example.com', password: 'a-long-password',
    options: { data: { display_name: 'New member' }, emailRedirectTo: 'http://localhost:3000/auth/callback?locale=vi' },
  });
  expect(mocks.signOut).not.toHaveBeenCalled();
});

