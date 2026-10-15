import vi from './vi.json';
import en from './en.json';
import type { Locale } from './config';

export const dictionaries = { vi, en } satisfies Record<Locale, typeof vi>;
