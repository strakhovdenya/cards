import { describe, it, expect } from 'vitest';
import {
  normalizeGermanWord,
  isDuplicateGermanWord,
  toNormalizedWordSet,
  extractGermanWords,
} from '@/utils/verbUtils';

describe('normalizeGermanWord (verbUtils)', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeGermanWord('  laufen  ')).toBe('laufen');
  });

  it('converts to lowercase', () => {
    expect(normalizeGermanWord('LAUFEN')).toBe('laufen');
  });

  it('removes commas', () => {
    expect(normalizeGermanWord('laufen,')).toBe('laufen');
  });

  it('removes internal spaces', () => {
    expect(normalizeGermanWord('an kommen')).toBe('ankommen');
  });

  it('combines all transformations', () => {
    expect(normalizeGermanWord('  An Kommen,  ')).toBe('ankommen');
  });

  it('handles empty string', () => {
    expect(normalizeGermanWord('')).toBe('');
  });
});

describe('isDuplicateGermanWord (verbUtils)', () => {
  it('returns true for exact match', () => {
    expect(
      isDuplicateGermanWord('laufen', toNormalizedWordSet(['laufen', 'gehen']))
    ).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(
      isDuplicateGermanWord('LAUFEN', toNormalizedWordSet(['laufen']))
    ).toBe(true);
  });

  it('returns true ignoring spaces', () => {
    expect(
      isDuplicateGermanWord('an kommen', toNormalizedWordSet(['ankommen']))
    ).toBe(true);
  });

  it('returns true ignoring commas', () => {
    expect(
      isDuplicateGermanWord('laufen,', toNormalizedWordSet(['laufen']))
    ).toBe(true);
  });

  it('returns false for non-duplicate', () => {
    expect(
      isDuplicateGermanWord('rennen', toNormalizedWordSet(['laufen', 'gehen']))
    ).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(isDuplicateGermanWord('laufen', toNormalizedWordSet([]))).toBe(
      false
    );
  });
});

describe('extractGermanWords (verbUtils)', () => {
  it('extracts infinitive from verbs', () => {
    const verbs = [{ infinitive: 'laufen' }, { infinitive: 'gehen' }];
    expect(extractGermanWords(verbs)).toEqual(['laufen', 'gehen']);
  });

  it('returns empty array for empty input', () => {
    expect(extractGermanWords([])).toEqual([]);
  });
});
