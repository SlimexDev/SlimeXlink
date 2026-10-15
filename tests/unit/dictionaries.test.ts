import { expect, it } from 'vitest';
import { dictionaries } from '../../src/i18n/dictionaries';

it('provides the same non-empty messages in both languages', () => {
  expect(Object.keys(dictionaries.vi).sort()).toEqual(Object.keys(dictionaries.en).sort());
  for (const dictionary of Object.values(dictionaries)) {
    for (const message of Object.values(dictionary)) expect(message.trim().length).toBeGreaterThan(0);
  }
  expect(dictionaries.vi.title).not.toBe(dictionaries.en.title);
});
