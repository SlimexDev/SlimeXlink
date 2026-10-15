import { expect, it } from 'vitest';
import { getTestConfig } from './setup';

it('connects to the real Supabase Auth settings API using the test publishable key', async () => {
  const config = getTestConfig();
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(10000),
  });
  expect(response.status).toBe(200);
  const settings = await response.json();
  expect(settings).toHaveProperty('external');
});

it('connects to the real Data API schema endpoint', async () => {
  const config = getTestConfig();
  const response = await fetch(`${config.url}/rest/v1/`, {
    headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(10000),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('json');
});
