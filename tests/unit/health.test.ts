import { expect, it, vi } from 'vitest';
import { GET } from '../../src/app/api/health/route';

it('reports liveness without claiming database readiness or exposing environment', async () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  try {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ok' });
  } finally { log.mockRestore(); }
});
