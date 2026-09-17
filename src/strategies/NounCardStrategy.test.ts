import { describe, it, expect } from 'vitest';
import { NounCardStrategy } from '@/strategies/NounCardStrategy';
import type { Card } from '@/types';

function makeNounCard(grammarData?: Record<string, unknown>): Card {
  return {
    id: '1',
    germanWord: 'der Mann',
    translation: 'мужчина',
    user_id: 'user1',
    tags: [],
    learned: false,
    word_type: 'noun',
    grammar_data: grammarData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('NounCardStrategy', () => {
  const strategy = new NounCardStrategy();

  it('getDisplayData - german front: frontText is germanWord', () => {
    const result = strategy.getDisplayData(makeNounCard(), 'german');
    expect(result.frontText).toBe('der Mann');
    expect(result.backText).toBe('мужчина');
    expect(result.speechText).toBe('der Mann');
  });

  it('getDisplayData - russian front: frontText is translation', () => {
    const result = strategy.getDisplayData(makeNounCard(), 'russian');
    expect(result.frontText).toBe('мужчина');
    expect(result.backText).toBe('der Mann');
  });

  it('getDisplayData - grammar_data with article and plural adds grammarInfo', () => {
    const card = makeNounCard({ article: 'der', plural: 'die Männer' });
    const result = strategy.getDisplayData(card, 'german');
    const info = result.additionalInfo as Record<string, unknown>;
    expect(info.grammarInfo).toEqual({ article: 'der', plural: 'die Männer' });
  });

  it('getDisplayData - grammar_data with only article adds grammarInfo', () => {
    const card = makeNounCard({ article: 'die' });
    const result = strategy.getDisplayData(card, 'german');
    const info = result.additionalInfo as Record<string, unknown>;
    expect(info.grammarInfo).toEqual({ article: 'die', plural: undefined });
  });

  it('getDisplayData - no grammar_data means no grammarInfo', () => {
    const result = strategy.getDisplayData(makeNounCard(), 'german');
    const info = result.additionalInfo as Record<string, unknown>;
    expect(info.grammarInfo).toBeUndefined();
  });

  it('getSpeechText returns germanWord', () => {
    expect(strategy.getSpeechText(makeNounCard())).toBe('der Mann');
  });

  it('getTags returns mapped tags', () => {
    const card: Card = {
      ...makeNounCard(),
      tags: [
        {
          id: 't1',
          name: 'nouns',
          color: '#0f0',
          user_id: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    expect(strategy.getTags(card)).toEqual([
      { id: 't1', name: 'nouns', color: '#0f0' },
    ]);
  });

  it('supports returns true only for noun word_type', () => {
    expect(strategy.supports(makeNounCard())).toBe(true);
    const nonNoun: Card = { ...makeNounCard(), word_type: 'verb' };
    expect(strategy.supports(nonNoun)).toBe(false);
  });

  it('getType returns noun-card', () => {
    expect(strategy.getType()).toBe('noun-card');
  });
});
