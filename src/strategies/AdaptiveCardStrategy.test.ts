import { describe, it, expect } from 'vitest';
import { AdaptiveCardStrategy } from '@/strategies/AdaptiveCardStrategy';
import { BasicCardStrategy } from '@/strategies/BasicCardStrategy';
import { NounCardStrategy } from '@/strategies/NounCardStrategy';
import type { Card } from '@/types';

function makeCard(word_type?: string): Card {
  return {
    id: '1',
    germanWord: 'Hund',
    translation: 'собака',
    user_id: 'user1',
    tags: [],
    learned: false,
    word_type,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AdaptiveCardStrategy', () => {
  const adaptive = new AdaptiveCardStrategy();
  const basic = new BasicCardStrategy();
  const noun = new NounCardStrategy();

  it('noun card - same getDisplayData result as NounCardStrategy', () => {
    const card = makeCard('noun');
    expect(adaptive.getDisplayData(card, 'german')).toEqual(
      noun.getDisplayData(card, 'german')
    );
  });

  it('verb card - same getDisplayData result as BasicCardStrategy', () => {
    const card = makeCard('verb');
    expect(adaptive.getDisplayData(card, 'german')).toEqual(
      basic.getDisplayData(card, 'german')
    );
  });

  it('card with undefined word_type - uses BasicCardStrategy', () => {
    const card = makeCard(undefined);
    expect(adaptive.getDisplayData(card, 'german')).toEqual(
      basic.getDisplayData(card, 'german')
    );
  });

  it('getSpeechText - noun card matches NounCardStrategy', () => {
    const card = makeCard('noun');
    expect(adaptive.getSpeechText(card)).toBe(noun.getSpeechText(card));
  });

  it('getTags - non-noun card matches BasicCardStrategy', () => {
    const card = makeCard('adjective');
    expect(adaptive.getTags(card)).toEqual(basic.getTags(card));
  });

  it('getType returns adaptive-card', () => {
    expect(adaptive.getType()).toBe('adaptive-card');
  });
});
