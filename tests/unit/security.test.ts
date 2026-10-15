import { expect, it } from 'vitest';
import { contentSecurityPolicy } from '../../src/lib/security';

it('uses a per-response nonce without allowing inline scripts or eval in production', () => {
  const policy = contentSecurityPolicy('test-nonce', 'https://test.supabase.co', false);
  expect(policy).toContain("'nonce-test-nonce'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain('connect-src');
  expect(policy).not.toContain('unsafe-inline');
  expect(policy).not.toContain('unsafe-eval');
  expect(contentSecurityPolicy('another', undefined, true)).toContain('unsafe-eval');
});
