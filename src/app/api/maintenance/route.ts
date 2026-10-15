import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logEvent } from '@/lib/logger';
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  if (!secret || secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await createAdminClient().rpc('cleanup_expired_data');
  if (result.error) logEvent({ event: 'maintenance_failed', requestId: crypto.randomUUID(), status: 503, durationMs: 0 });
  return NextResponse.json({ status: result.error ? 'error' : 'ok' }, { status: result.error ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
