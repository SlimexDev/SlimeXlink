type Diagnostic = {
  event: 'health' | 'auth_refresh_unavailable' | 'supabase_configuration_invalid';
  requestId: string;
  status: number;
  durationMs: number;
};

export function logEvent({ event, requestId, status, durationMs }: Diagnostic) {
  console.info(JSON.stringify({ event, requestId, status, durationMs }));
}
