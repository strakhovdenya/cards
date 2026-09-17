import { describe, it, expect } from 'vitest';
import { BasicCardStrategy } from '@/strategies/BasicCardStrategy';
import type { Card } from '@/types';

const mockCard: Card = {
  id: '1',
  germanWord: 'der Hund',
  translation: 'собака',
  user_id: 'user1',
  tags: [
    {
      id: 't1',
      name: 'animals',
      color: '#f00',
      user_id: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  learned: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BasicCardStrategy', () => {
  const strategy = new BasicCardStrategy();

  it('getDisplayData - german front: frontText is germanWord', () => {
    const result = strategy.getDisplayData(mockCard, 'german');
    expect(result.frontText).toBe('der Hund');
    expect(result.backText).toBe('собака');
    expect(result.speechText).toBe('der Hund');
  });

  it('getDisplayData - russian front: frontText is translation', () => {
    const result = strategy.getDisplayData(mockCard, 'russian');
    expect(result.frontText).toBe('собака');
    expect(result.backText).toBe('der Hund');
  });

  it('getDisplayData - includes mapped tags', () => {
    const result = strategy.getDisplayData(mockCard, 'german');
    expect(result.tags).toEqual([{ id: 't1', name: 'animals', color: '#f00' }]);
  });

  it('getDisplayData - empty tags array', () => {
    const cardNoTags: Card = { ...mockCard, tags: [] };
    const result = strategy.getDisplayData(cardNoTags, 'german');
    expect(result.tags).toEqual([]);
  });

  it('getSpeechText returns germanWord', () => {
    expect(strategy.getSpeechText(mockCard)).toBe('der Hund');
  });

  it('getTags returns mapped tags', () => {
    expect(strategy.getTags(mockCard)).toEqual([
      { id: 't1', name: 'animals', color: '#f00' },
    ]);
  });

  it('getTags returns empty array for card with no tags', () => {
    const cardNoTags: Card = { ...mockCard, tags: [] };
    expect(strategy.getTags(cardNoTags)).toEqual([]);
  });

  it('supports returns true for card with germanWord and translation', () => {
    expect(strategy.supports(mockCard)).toBe(true);
  });

  it('getType returns basic-card', () => {
    expect(strategy.getType()).toBe('basic-card');
  });
});
