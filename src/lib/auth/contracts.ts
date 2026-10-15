import { z } from 'zod';
import type { Locale } from '../../i18n/config';

export const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict();
export const signupSchema = loginSchema.extend({ password: z.string().min(12).max(128), displayName: z.string().trim().min(1).max(80) }).strict();
export const profileSchema = z.object({ displayName: z.string().trim().min(1).max(80) }).strict();
export const resetPasswordSchema = z.object({ password: signupSchema.shape.password, confirmPassword: z.string() }).strict().refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'PASSWORD_MISMATCH' });
const accessSchema = z.object({ role: z.enum(['member', 'admin']), status: z.enum(['active', 'suspended']) });

export function accountAccess(value: unknown) {
  const result = accessSchema.safeParse(value);
  return result.success && result.data.status === 'active' ? result.data : null;
}

export function safeReturnPath(value: unknown, locale: Locale): string {
  return typeof value === 'string' && /^\/(vi|en)\/(dashboard|settings)$/.test(value) ? value : `/${locale}/dashboard`;
}

export type AuthCode = 'INVALID_INPUT' | 'INVALID_AVATAR' | 'AVATAR_SAVED' | 'PROFILE_CONFLICT' | 'INVALID_CREDENTIALS' | 'AUTH_LINK_INVALID' | 'RECOVERY_REQUESTED' | 'RECOVERY_EXPIRED' | 'PASSWORD_CHANGED' | 'EMAIL_CONFIRMATION_REQUIRED' | 'SERVICE_UNAVAILABLE' | 'ACCOUNT_SUSPENDED' | 'RATE_LIMITED' | 'EMAIL_SENT' | 'CONFIRMATION_REQUESTED' | 'PROFILE_SAVED' | 'PROVIDER_NOT_CONFIGURED';
export type AuthState = { code?: AuthCode };
