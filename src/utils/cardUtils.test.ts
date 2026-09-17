import { describe, it, expect } from 'vitest';
import {
  normalizeGermanWord,
  isDuplicateGermanWord,
  extractGermanWords,
} from '@/utils/cardUtils';

describe('normalizeGermanWord', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeGermanWord('  Hund  ')).toBe('hund');
  });

  it('converts to lowercase', () => {
    expect(normalizeGermanWord('HUND')).toBe('hund');
  });

  it('removes commas', () => {
    expect(normalizeGermanWord('der Mann,')).toBe('dermann');
  });

  it('removes internal spaces', () => {
    expect(normalizeGermanWord('der Hund')).toBe('derhund');
  });

  it('combines all transformations', () => {
    expect(normalizeGermanWord('  Der Hund,  ')).toBe('derhund');
  });

  it('handles empty string', () => {
    expect(normalizeGermanWord('')).toBe('');
  });
});

describe('isDuplicateGermanWord', () => {
  it('returns true for exact match', () => {
    expect(isDuplicateGermanWord('Hund', ['Hund', 'Katze'])).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(isDuplicateGermanWord('hund', ['Hund', 'Katze'])).toBe(true);
  });

  it('returns true ignoring spaces', () => {
    expect(isDuplicateGermanWord('der Hund', ['derHund'])).toBe(true);
  });

  it('returns true ignoring commas', () => {
    expect(
      isDuplicateGermanWord('der Mann, die Männer', ['dermanndiemänner'])
    ).toBe(true);
  });

  it('returns false for non-duplicate', () => {
    expect(isDuplicateGermanWord('Wolf', ['Hund', 'Katze'])).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(isDuplicateGermanWord('Hund', [])).toBe(false);
  });
});

describe('extractGermanWords', () => {
  it('extracts germanWord from cards', () => {
    const cards = [{ germanWord: 'Hund' }, { germanWord: 'Katze' }];
    expect(extractGermanWords(cards)).toEqual(['Hund', 'Katze']);
  });

  it('returns empty array for empty input', () => {
    expect(extractGermanWords([])).toEqual([]);
  });
});
