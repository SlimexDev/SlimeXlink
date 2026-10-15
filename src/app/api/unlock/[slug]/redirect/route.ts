import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicLink } from '@/lib/links/public';
import { visitorCookie, visitorDigest, unlockCookie, grantDigest, visitorOptions } from '@/lib/links/visitor';
import { webUrlSchema } from '@/lib/links/contracts';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const result = await getPublicLink(slug);
    const visitor = request.cookies.get(visitorCookie)?.value;
    const [session, token] = (request.cookies.get(unlockCookie)?.value ?? '').split('.');
    if (!result.link || !visitor || !z.uuid().safeParse(session).success || !/^[a-f0-9]{64}$/.test(token ?? '')) throw new Error('INVALID_GRANT');
    const consumed = await createAdminClient().rpc('consume_unlock', { session_uuid: session, visitor: visitorDigest(visitor, result.link.id), link_uuid: result.link.id, grant_hash: grantDigest(token) });
    if (consumed.error || !webUrlSchema.safeParse(consumed.data).success) throw new Error('INVALID_GRANT');
    const response = NextResponse.redirect(consumed.data, 303);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.cookies.set(unlockCookie, '', { ...visitorOptions, path: '/api/unlock', maxAge: 0 });
    return response;
  } catch { return new NextResponse('Link unavailable or unlock expired. / Link không khả dụng hoặc quyền mở khóa đã hết hạn.', { status: 403, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } }); }
}
