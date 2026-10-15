import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ limit: vi.fn(), request: vi.fn(), update: vi.fn(), signOut: vi.fn(), grant: vi.fn(), remove: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ delete: mocks.remove }) }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock('../../src/lib/auth/service', () => ({ consumeAuthLimit: mocks.limit, siteOrigin: () => 'http://localhost:3000' }));
vi.mock('../../src/lib/auth/recovery', () => ({ getRecoveryGrant: mocks.grant }));
vi.mock('../../src/lib/logger', () => ({ logEvent: vi.fn() }));
vi.mock('../../src/lib/auth/guards', () => ({ requireActor: async () => ({ client: {}, user: { id: 'test-user' } }) }));
vi.mock('../../src/lib/supabase/server', () => ({ createServerSupabaseClient: async () => ({ auth: { resetPasswordForEmail: mocks.request, updateUser: mocks.update, signOut: mocks.signOut } }) }));
import { requestRecovery, resetPassword } from '../../src/lib/auth/recovery-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue(true);
  mocks.request.mockResolvedValue({ error: null });
  mocks.update.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.grant.mockResolvedValue({ nonce: 'valid-nonce' });
});
const form = (values: Record<string, string>) => { const result = new FormData(); Object.entries(values).forEach(([key, value]) => result.set(key, value)); return result; };
it('validates email and limits requests before sending to the configured callback', async () => {
  expect(await requestRecovery('vi', {}, form({ email: 'invalid' }))).toEqual({ code: 'INVALID_INPUT' });
  expect(mocks.request).not.toHaveBeenCalled();
  expect(await requestRecovery('en', {}, form({ email: 'user@example.com' }))).toEqual({ code: 'RECOVERY_REQUESTED' });
  expect(mocks.request).toHaveBeenCalledWith('user@example.com', { redirectTo: 'http://localhost:3000/auth/callback?locale=en' });
  mocks.request.mockResolvedValueOnce({ error: { code: 'user_not_found' } });
  expect(await requestRecovery('en', {}, form({ email: 'unknown@example.com' }))).toEqual({ code: 'RECOVERY_REQUESTED' });
  mocks.request.mockResolvedValueOnce({ error: { code: 'email_address_not_authorized' } });
  expect(await requestRecovery('en', {}, form({ email: 'existing@example.com' }))).toEqual({ code: 'RECOVERY_REQUESTED' });
});
it('rejects mismatched passwords, absent grants and consumed grants', async () => {
  const input = form({ password: 'new-password-123', confirmPassword: 'different-password' });
  expect(await resetPassword('vi', {}, input)).toEqual({ code: 'INVALID_INPUT' });
  input.set('confirmPassword', 'new-password-123');
  mocks.grant.mockResolvedValueOnce(null);
  expect(await resetPassword('vi', {}, input)).toEqual({ code: 'RECOVERY_EXPIRED' });
  mocks.limit.mockResolvedValueOnce(false);
  expect(await resetPassword('vi', {}, input)).toEqual({ code: 'RECOVERY_EXPIRED' });
  expect(mocks.update).not.toHaveBeenCalled();
});
it('consumes the grant before changing password and signs out after success', async () => {
  await expect(resetPassword('vi', {}, form({ password: 'new-password-123', confirmPassword: 'new-password-123' }))).rejects.toThrow('REDIRECT:/vi/login?notice=PASSWORD_CHANGED');
  expect(mocks.limit).toHaveBeenCalledWith('recovery-use', 'valid-nonce');
  expect(mocks.limit.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
  expect(mocks.remove).toHaveBeenCalledWith('slimex_recovery');
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'global' });
});
it('fails closed when storage fails and never reports a failed password write as success', async () => {
  const input = form({ password: 'new-password-123', confirmPassword: 'new-password-123' });
  mocks.limit.mockRejectedValueOnce(new Error('offline'));
  expect(await resetPassword('vi', {}, input)).toEqual({ code: 'SERVICE_UNAVAILABLE' });
  expect(mocks.update).not.toHaveBeenCalled();
  mocks.update.mockResolvedValueOnce({ error: { code: 'offline' } });
  expect(await resetPassword('vi', {}, input)).toEqual({ code: 'SERVICE_UNAVAILABLE' });
  expect(mocks.signOut).not.toHaveBeenCalled();
});
