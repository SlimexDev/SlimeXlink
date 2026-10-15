import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { siteOrigin } from '@/lib/auth/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicLink } from '@/lib/links/public';
import { newVisitor, visitorCookie, visitorOptions, visitorDigest, unlockCookie, grantDigest } from '@/lib/links/visitor';
import { logEvent } from '@/lib/logger';

const inputSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('session') }).strict(),
  z.object({ operation: z.literal('start'), session: z.uuid(), task: z.uuid() }).strict(),
  z.object({ operation: z.literal('finish'), session: z.uuid(), task: z.uuid(), attempt: z.uuid() }).strict(),
  z.object({ operation: z.literal('depart'), session: z.uuid(), task: z.uuid(), attempt: z.uuid() }).strict(),
  z.object({ operation: z.literal('fail'), session: z.uuid(), task: z.uuid(), attempt: z.uuid() }).strict(),
  z.object({ operation: z.literal('unlock'), session: z.uuid() }).strict(),
]);
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    if (request.headers.get('origin') !== siteOrigin()) return response({ error: 'INVALID_ORIGIN' }, 403);
    if (Number(request.headers.get('content-length')) > 2048) return response({ error: 'INVALID_INPUT' }, 413);
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return response({ error: 'INVALID_INPUT' }, 400);
    const { slug } = await params;
    const publicLink = await getPublicLink(slug);
    if (!publicLink.link) return response({ error: 'UNAVAILABLE' }, 404);
    const { id } = publicLink.link;
    const input = parsed.data;
    let visitor = request.cookies.get(visitorCookie)?.value;
    if (!visitor || !/^[a-f0-9]{64}$/.test(visitor)) {
      if (input.operation !== 'session') return response({ error: 'INVALID_SESSION' }, 403);
      visitor = newVisitor();
    }
    const digest = visitorDigest(visitor, id);
    const admin = createAdminClient();
    if (input.operation === 'session') {
      const opened = await admin.rpc('open_unlock_session', { link_uuid: id, visitor: digest });
      if (opened.error) return response({ error: opened.error.message.includes('RATE_LIMITED') ? 'RATE_LIMITED' : 'UNAVAILABLE' }, 429);
      const progress = await admin.from('task_results').select('task_id,status,attempt_id,required_seconds').eq('session_id', opened.data);
      if (progress.error) return response({ error: 'UNAVAILABLE' }, 503);
      const result = response({ session: opened.data, progress: progress.data });
      result.cookies.set(visitorCookie, visitor, visitorOptions);
      return result;
    }
    // Bind the caller's session to this URL before any service-role operation.
    const session = await admin.from('unlock_sessions').select('id').eq('id', input.session).eq('link_id', id).eq('visitor_hash', digest).maybeSingle();
    if (session.error || !session.data) return response({ error: 'INVALID_SESSION' }, 403);
    if (input.operation === 'unlock') {
      const token = newVisitor();
      const result = await admin.rpc('issue_unlock', { session_uuid: input.session, visitor: digest, link_uuid: id, grant_hash: grantDigest(token) });
      if (result.error) return response({ error: 'TASKS_INCOMPLETE' }, 403);
      const reply = response({ ready: true });
      reply.cookies.set(unlockCookie, `${input.session}.${token}`, { ...visitorOptions, path: '/api/unlock', maxAge: 60 });
      return reply;
    }
    const args = { session_uuid: input.session, visitor: digest, task_uuid: input.task };
    const result = input.operation === 'start' ? await admin.rpc('start_link_task', args) : await admin.rpc(input.operation === 'depart' ? 'depart_link_task' : input.operation === 'fail' ? 'fail_link_task' : 'finish_link_task', { ...args, attempt_uuid: input.attempt });
    if (result.error) return response({ error: 'TASK_FAILED' }, 400);
    return response(input.operation === 'start' ? result.data : { status: result.data });
  } catch {
    logEvent({ event: 'link_request_failed', requestId, status: 503, durationMs: Math.round(performance.now() - started) });
    const result = response({ error: 'UNAVAILABLE' }, 503);
    result.headers.set('x-request-id', requestId);
    return result;
  }
}
