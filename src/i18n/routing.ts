import { resolveLocale } from './config';

export function localeRedirect(pathname: string, preference?: string): string | null {
  return pathname === '/' ? `/${resolveLocale(undefined, preference)}` : null;
}
