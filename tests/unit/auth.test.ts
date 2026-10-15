import { expect, it } from 'vitest';
import { loginSchema, signupSchema, safeReturnPath, accountAccess } from '../../src/lib/auth/contracts';

it('validates credentials without changing passwords or accepting privilege fields', () => {
  expect(loginSchema.parse({ email: ' person@example.com ', password: ' secret ' }).password).toBe(' secret ');
  expect(signupSchema.safeParse({ email: 'a@b.com', password: 'short', displayName: 'A' }).success).toBe(false);
  expect(signupSchema.safeParse({ email: 'a@b.com', password: 'abcdefghijkl', displayName: 'A', role: 'admin' }).success).toBe(false);
});
it('allows only known internal account destinations', () => {
  expect(safeReturnPath('/en/settings', 'vi')).toBe('/en/settings');
  for (const path of ['https://evil.com', '//evil.com', '/\\evil.com', '/vi/dashboard?token=abc', '/%2f%2fevil.com', '/vi/unknown']) expect(safeReturnPath(path, 'vi')).toBe('/vi/dashboard');
});
it('fails closed for missing, malformed or suspended roles', () => {
  expect(accountAccess(null)).toBeNull();
  expect(accountAccess({ role: 'admin', status: 'suspended' })).toBeNull();
  expect(accountAccess({ role: 'superadmin', status: 'active' })).toBeNull();
  expect(accountAccess({ role: 'member', status: 'active' })).toEqual({ role: 'member', status: 'active' });
  expect(accountAccess({ role: 'admin', status: 'active' })?.role).toBe('admin');
});
