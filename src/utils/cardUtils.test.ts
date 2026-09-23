import { describe, it, expect } from 'vitest';
import {
  normalizeGermanWord,
  isDuplicateGermanWord,
  toNormalizedWordSet,
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

describe('toNormalizedWordSet', () => {
  it('normalizes every word', () => {
    expect(toNormalizedWordSet([' Der Hund, ', 'KATZE'])).toEqual(
      new Set(['derhund', 'katze'])
    );
  });

  it('collapses words that normalize equally', () => {
    expect(toNormalizedWordSet(['Hund', 'hund ']).size).toBe(1);
  });

  it('returns empty set for empty input', () => {
    expect(toNormalizedWordSet([]).size).toBe(0);
  });
});

describe('isDuplicateGermanWord', () => {
  it('returns true for exact match', () => {
    expect(
      isDuplicateGermanWord('Hund', toNormalizedWordSet(['Hund', 'Katze']))
    ).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(
      isDuplicateGermanWord('hund', toNormalizedWordSet(['Hund', 'Katze']))
    ).toBe(true);
  });

  it('returns true ignoring spaces', () => {
    expect(
      isDuplicateGermanWord('der Hund', toNormalizedWordSet(['derHund']))
    ).toBe(true);
  });

  it('returns true ignoring commas', () => {
    expect(
      isDuplicateGermanWord(
        'der Mann, die Männer',
        toNormalizedWordSet(['dermanndiemänner'])
      )
    ).toBe(true);
  });

  it('returns false for non-duplicate', () => {
    expect(
      isDuplicateGermanWord('Wolf', toNormalizedWordSet(['Hund', 'Katze']))
    ).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(isDuplicateGermanWord('Hund', toNormalizedWordSet([]))).toBe(false);
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
