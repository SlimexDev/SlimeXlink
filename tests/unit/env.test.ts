import { describe, expect, it } from 'vitest';
import { parsePublicEnv, parseAdminEnv } from '../../src/lib/env/schema';

const configured = { NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };

describe('environment validation', () => {
  it('allows an unconfigured shell, but rejects partial configuration', () => {
    expect(parsePublicEnv({})).toBeNull();
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: configured.NEXT_PUBLIC_SUPABASE_URL })).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });
  it('accepts http only for loopback development and rejects URL credentials', () => {
    expect(parsePublicEnv(configured)?.url).toBe(configured.NEXT_PUBLIC_SUPABASE_URL);
    expect(parsePublicEnv({ ...configured, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' })?.url).toBe('http://127.0.0.1:54321');
    for (const url of ['javascript:alert(1)', 'http://project.supabase.co', 'https://user:password@project.supabase.co', 'https://project.supabase.co/?token=secret']) {
      expect(() => parsePublicEnv({ ...configured, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow('NEXT_PUBLIC_SUPABASE_URL');
    }
    expect(() => parsePublicEnv({ ...configured, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }, true)).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });
  it('rejects a secret key accidentally assigned to a public environment variable', () => {
    expect(() => parsePublicEnv({ ...configured, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_must-stay-private' })).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });
  it('does not include invalid values in errors or return secret fields as public config', () => {
    const input = { ...configured, SUPABASE_SERVICE_ROLE_KEY: 'private-canary' };
    expect(JSON.stringify(parsePublicEnv(input))).not.toContain('private-canary');
    expect(() => parsePublicEnv({ ...configured, NEXT_PUBLIC_SUPABASE_URL: 'private-canary' })).not.toThrow('private-canary');
    expect(() => parseAdminEnv({ ...configured, SUPABASE_SERVICE_ROLE_KEY: '' })).toThrow('SUPABASE_SERVICE_ROLE_KEY');
    expect(parseAdminEnv(input).serviceRoleKey).toBe('private-canary');
  });
});
