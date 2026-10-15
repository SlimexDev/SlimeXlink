import { expect, it } from 'vitest';
import { getTestConfig } from './setup';
import { createClient } from '@supabase/supabase-js';

it('connects to the real Supabase Auth settings API using the test publishable key', async () => {
  const config = getTestConfig();
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(10000),
  });
  expect(response.status).toBe(200);
  const settings = await response.json();
  expect(settings).toHaveProperty('external');
});

it('reaches PostgREST through the SDK without needing schema introspection privileges', async () => {
  const config = getTestConfig();
  const client = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.from('slimexlink_connectivity_probe_not_a_real_table').select('id').limit(1);
  expect(result.status).toBe(404);
  expect(result.error?.code).toBe('PGRST205');
});
