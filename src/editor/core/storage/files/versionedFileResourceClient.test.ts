import { describe, expect, it } from 'vitest';
import { sanitizeFileName } from './versionedFileResourceClient';

describe('sanitizeFileName', () => {
  it('strips a leading underscore, so no name can reach a reserved slot', () => {
    expect(sanitizeFileName('_working')).toBe('working');
    expect(sanitizeFileName('__active')).toBe('active');
  });

  it('keeps underscores inside the name', () => {
    expect(sanitizeFileName('my_theme')).toBe('my_theme');
  });

  it('falls back to "unnamed" when only reserved characters remain', () => {
    expect(sanitizeFileName('___')).toBe('unnamed');
  });

  it('lowercases, dashes spaces, and trims stray dashes', () => {
    expect(sanitizeFileName('  Midnight  Study! ')).toBe('midnight-study');
  });
});
