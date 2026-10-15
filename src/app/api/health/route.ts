import { logEvent } from '../../../lib/logger';

export function GET() {
  logEvent({ event: 'health', requestId: crypto.randomUUID(), status: 200, durationMs: 0 });
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
