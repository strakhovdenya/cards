import { describe, it, expect } from 'vitest';
import { BasicCardEditorStrategy } from '@/strategies/BasicCardEditorStrategy';
import type { Card } from '@/types';

function makeCard(): Card {
  return {
    id: '1',
    germanWord: 'Hund',
    translation: 'собака',
    user_id: 'user1',
    tags: [
      {
        id: 't1',
        name: 'A1',
        color: '#f00',
        user_id: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    learned: false,
    word_type: 'verb',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('BasicCardEditorStrategy', () => {
  const strategy = new BasicCardEditorStrategy();

  it('getEditorFields returns empty array', () => {
    expect(strategy.getEditorFields()).toEqual([]);
  });

  it('getInitialFormData with card - fills from card', () => {
    const data = strategy.getInitialFormData(makeCard());
    expect(data.germanWord).toBe('Hund');
    expect(data.translation).toBe('собака');
    expect(data.tags).toEqual(['A1']);
    expect(data.word_type).toBe('verb');
  });

  it('getInitialFormData without card - returns empty defaults', () => {
    const data = strategy.getInitialFormData();
    expect(data.germanWord).toBe('');
    expect(data.translation).toBe('');
    expect(data.tags).toEqual([]);
    expect(data.word_type).toBeUndefined();
  });

  it('validateFields returns no errors', () => {
    expect(strategy.validateFields()).toEqual({});
  });

  it('supports returns true for non-noun card', () => {
    expect(strategy.supports(makeCard())).toBe(true);
  });

  it('supports returns false for noun card', () => {
    const nounCard: Card = { ...makeCard(), word_type: 'noun' };
    expect(strategy.supports(nounCard)).toBe(false);
  });

  it('getType returns basic-card-editor', () => {
    expect(strategy.getType()).toBe('basic-card-editor');
  });

  it('getDisplayName returns display name', () => {
    expect(strategy.getDisplayName()).toBe('Обычная карточка');
  });
});
