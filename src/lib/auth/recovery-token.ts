import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const recoveryCookie = 'slimex_recovery';
export const recoverySeconds = 900;
export const recoveryIdentitySchema = z.object({ userId: z.uuid(), sessionId: z.uuid() });
const grantSchema = recoveryIdentitySchema.extend({ nonce: z.string().regex(/^[a-f0-9]{64}$/), issued: z.number().int(), expires: z.number().int() }).strict();
type Identity = z.infer<typeof recoveryIdentitySchema>;

function signature(body: string, secret: string) {
  if (secret.length < 32) throw new Error('RECOVERY_NOT_CONFIGURED');
  return createHmac('sha256', secret).update(`recovery-v1:${body}`).digest('hex');
}

export function createRecoveryToken(identity: Identity, secret: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...recoveryIdentitySchema.parse(identity), nonce: randomBytes(32).toString('hex'), issued: now, expires: now + recoverySeconds * 1000 })).toString('base64url');
  return `${body}.${signature(body, secret)}`;
}

export function readRecoveryToken(token: string | undefined, identity: Identity, secret: string, now = Date.now()) {
  try {
    if (!token || token.length > 1500) return null;
    const [body, mac, extra] = token.split('.');
    if (!body || !mac || extra !== undefined || !/^[a-f0-9]{64}$/.test(mac)) return null;
    if (!timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(body, secret), 'hex'))) return null;
    const grant = grantSchema.parse(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')));
    if (grant.userId !== identity.userId || grant.sessionId !== identity.sessionId || grant.issued > now || grant.expires <= now || grant.expires - grant.issued !== recoverySeconds * 1000) return null;
    return grant;
  } catch { return null; }
}
