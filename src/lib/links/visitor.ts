import 'server-only';
import { createHmac, randomBytes, createHash } from 'node:crypto';
export const visitorCookie = 'slimex_visitor';
export const unlockCookie = 'slimex_unlock';
export const visitorOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 * 30 };
export function newVisitor() { return randomBytes(32).toString('hex'); }
export function visitorDigest(value: string, link: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('INVALID_VISITOR');
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error('VISITOR_NOT_CONFIGURED');
  return createHmac('sha256', secret).update(`visitor:${link}:${value}`).digest('hex');
}
export function grantDigest(value: string) { return createHash('sha256').update(value).digest('hex'); }
