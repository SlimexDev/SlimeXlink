export function contentSecurityPolicy(nonce: string, supabaseOrigin?: string, development = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''}${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ''}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
