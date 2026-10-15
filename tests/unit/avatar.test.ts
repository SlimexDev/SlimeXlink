import { expect, it } from 'vitest';
import { avatarType, avatarPath } from '../../src/lib/profile/avatar-validation';
it('accepts only matching raster signatures and enforces the byte limit', () => {
  const png = new Uint8Array([137,80,78,71,13,10,26,10,0]);
  expect(avatarType(png, 'image/png')).toEqual({ mime: 'image/png', extension: 'png' });
  expect(avatarType(png, 'image/jpeg')).toBeNull();
  expect(avatarType(new Uint8Array([60,115,118,103,62]), 'image/svg+xml')).toBeNull();
  expect(avatarType(new Uint8Array(1048577), 'image/png')).toBeNull();
  expect(avatarType(new Uint8Array(), 'image/png')).toBeNull();
});
it('only accepts generated own-avatar paths', () => {
  const id = crypto.randomUUID();
  expect(avatarPath(`${id}/${crypto.randomUUID()}.png`, id)).toBe(true);
  expect(avatarPath(`${crypto.randomUUID()}/image.png`, id)).toBe(false);
  expect(avatarPath(`${id}/../other.png`, id)).toBe(false);
});
