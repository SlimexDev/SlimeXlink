import { expect, it, vi } from 'vitest';
import { logEvent } from '../../src/lib/logger';

it('logs only allowlisted diagnostic fields, even if the caller supplies extra fields', () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  try {
    const record = { event: 'health' as const, status: 200, durationMs: 3, requestId: '00000000-0000-4000-8000-000000000001', password: 'private-canary', authorization: 'Bearer private-canary' };
    logEvent(record);
    const output = String(log.mock.calls[0]?.[0]);
    expect(output).not.toContain('private-canary');
    expect(JSON.parse(output)).toEqual({ event: 'health', status: 200, durationMs: 3, requestId: record.requestId });
  } finally { log.mockRestore(); }
});
