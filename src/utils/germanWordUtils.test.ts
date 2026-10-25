import { describe, it, expect } from 'vitest';
import {
  normalizeGermanWord,
  toNormalizedWordSet,
  isDuplicateGermanWord,
} from '@/utils/germanWordUtils';
import * as cardUtils from '@/utils/cardUtils';
import * as verbUtils from '@/utils/verbUtils';

describe('normalizeGermanWord', () => {
  it('normalizes case, commas and spaces', () => {
    expect(normalizeGermanWord('  Der Hund,  ')).toBe('derhund');
    expect(normalizeGermanWord('  Hund')).toBe('hund');
    expect(normalizeGermanWord('HUND')).toBe('hund');
    expect(normalizeGermanWord('Hund,')).toBe('hund');
    expect(normalizeGermanWord('der Hund')).toBe('derhund');
  });

  it('normalizes empty and separator-only input to an empty string', () => {
    expect(normalizeGermanWord('')).toBe('');
    expect(normalizeGermanWord('   ')).toBe('');
    expect(normalizeGermanWord(' , ,')).toBe('');
  });
});

describe('toNormalizedWordSet', () => {
  it('keeps words that differ by letters apart', () => {
    const words = toNormalizedWordSet(['Hund', 'Hunde']);

    expect(words.size).toBe(2);
    expect(words.has('hund')).toBe(true);
    expect(words.has('hunde')).toBe(true);
  });
});

describe('isDuplicateGermanWord', () => {
  it('detects a duplicate after normalization', () => {
    const existing = toNormalizedWordSet(['Hund']);

    expect(isDuplicateGermanWord('hund', existing)).toBe(true);
    expect(isDuplicateGermanWord(' Hund ', existing)).toBe(true);
    expect(isDuplicateGermanWord('Hund,', existing)).toBe(true);
    expect(isDuplicateGermanWord('Hu nd', existing)).toBe(true);
  });

  it('does not flag a word missing from the set', () => {
    const existing = toNormalizedWordSet(['Hund', 'Katze']);

    expect(isDuplicateGermanWord('Maus', existing)).toBe(false);
    expect(isDuplicateGermanWord('Hund', new Set())).toBe(false);
  });
});

describe('cardUtils and verbUtils', () => {
  it('cardUtils and verbUtils reuse the shared functions', () => {
    const shared = {
      normalizeGermanWord,
      toNormalizedWordSet,
      isDuplicateGermanWord,
    };

    for (const [name, fn] of Object.entries(shared)) {
      expect(cardUtils[name as keyof typeof shared]).toBe(fn);
      expect(verbUtils[name as keyof typeof shared]).toBe(fn);
    }
  });

  it('keeps extractGermanWords separate for cards and verbs', () => {
    const fromCards = cardUtils.extractGermanWords([{ germanWord: 'Hund' }]);
    const fromVerbs = verbUtils.extractGermanWords([{ infinitive: 'gehen' }]);

    expect(fromCards).toEqual(['Hund']);
    expect(fromVerbs).toEqual(['gehen']);
    expect(cardUtils.extractGermanWords).not.toBe(verbUtils.extractGermanWords);
  });

  it('extractGermanWords returns an empty array for empty input', () => {
    expect(cardUtils.extractGermanWords([])).toEqual([]);
    expect(verbUtils.extractGermanWords([])).toEqual([]);
  });
});
