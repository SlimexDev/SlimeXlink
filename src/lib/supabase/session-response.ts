import type { NextResponse } from 'next/server';

export function copySessionResponse(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = source.headers.get(header);
    if (value) destination.headers.set(header, value);
  }
}
