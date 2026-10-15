import { z } from 'zod';

export const avatarMaxBytes = 1048576;
export function avatarType(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > avatarMaxBytes) return null;
  if (mime === 'image/png' && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) return { mime, extension: 'png' };
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime, extension: 'jpg' };
  if (mime === 'image/webp' && bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return { mime, extension: 'webp' };
  return null;
}
export function avatarPath(path: string, userId: string) {
  const [owner, file, extra] = path.split('/');
  return owner === userId && z.uuid().safeParse(owner).success && extra === undefined && /^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(file ?? '');
}
