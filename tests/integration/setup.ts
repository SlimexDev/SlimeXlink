import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePublicEnv } from '../../src/lib/env/schema';

const envPath = resolve('.env.test.local');
if (existsSync(envPath)) process.loadEnvFile(envPath);

export function getTestConfig() {
  if (process.env.TEST_ALLOW_SUPABASE !== 'true') throw new Error('Integration blocked: configure a separate test project and set TEST_ALLOW_SUPABASE=true in .env.test.local.');
  const config = parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.TEST_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config) throw new Error('Integration blocked: TEST_SUPABASE_URL and TEST_SUPABASE_PUBLISHABLE_KEY are required.');
  if (config.url === process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Integration blocked: the test project must be separate from the application project.');
  return config;
}
