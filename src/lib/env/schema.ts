import { z } from 'zod';

type Environment = Record<string, string | undefined>;
const origin = z.string().url().refine((value) => {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return (url.protocol === 'https:' || (local && url.protocol === 'http:')) && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/';
});
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: origin,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().regex(/^sb_publishable_[A-Za-z0-9_-]+$/),
});

export function parsePublicEnv(input: Environment, production = false) {
  if (!input.NEXT_PUBLIC_SUPABASE_URL && !input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const result = publicSchema.safeParse(input);
  if (!result.success) throw new Error(`Invalid configuration: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
  if (production && !result.data.NEXT_PUBLIC_SUPABASE_URL.startsWith('https:')) throw new Error('Invalid configuration: NEXT_PUBLIC_SUPABASE_URL');
  return { url: result.data.NEXT_PUBLIC_SUPABASE_URL, publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
}

export function parseAdminEnv(input: Environment) {
  const config = parsePublicEnv(input);
  if (!config) throw new Error('Missing configuration: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!input.SUPABASE_SERVICE_ROLE_KEY?.trim()) throw new Error('Missing configuration: SUPABASE_SERVICE_ROLE_KEY');
  return { ...config, serviceRoleKey: input.SUPABASE_SERVICE_ROLE_KEY };
}
