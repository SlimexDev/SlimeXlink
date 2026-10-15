import { expect, it } from 'vitest';
import { createRecoveryToken, readRecoveryToken } from '../../src/lib/auth/recovery-token';

const secret = 'test-secret-which-is-at-least-32-characters';
const identity = { userId: '4b8a7e40-d9c3-4af4-82d2-3e3514d86b08', sessionId: 'd78195d5-3256-4314-8681-279caf72a690' };
it('binds a recovery grant to its user and session', () => {
  const token = createRecoveryToken(identity, secret, 1000);
  expect(readRecoveryToken(token, identity, secret, 1001)?.nonce).toMatch(/^[a-f0-9]{64}$/);
  expect(readRecoveryToken(token, { ...identity, sessionId: crypto.randomUUID() }, secret, 1001)).toBeNull();
  expect(readRecoveryToken(token, { ...identity, userId: crypto.randomUUID() }, secret, 1001)).toBeNull();
});
it('expires exactly at fifteen minutes and rejects tampering or another key', () => {
  const token = createRecoveryToken(identity, secret, 1000);
  expect(readRecoveryToken(token, identity, secret, 900999)).not.toBeNull();
  expect(readRecoveryToken(token, identity, secret, 901000)).toBeNull();
  expect(readRecoveryToken(token + 'x', identity, secret, 1001)).toBeNull();
  expect(readRecoveryToken(token, identity, secret + 'x', 1001)).toBeNull();
  expect(readRecoveryToken('invalid', identity, secret, 1001)).toBeNull();
});
