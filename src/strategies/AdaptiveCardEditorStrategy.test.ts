import { describe, it, expect } from 'vitest';
import { AdaptiveCardEditorStrategy } from '@/strategies/AdaptiveCardEditorStrategy';
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
    grammar_data:
      word_type === 'noun'
        ? { article: 'der', plural: 'die Hunde' }
        : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AdaptiveCardEditorStrategy', () => {
  const strategy = new AdaptiveCardEditorStrategy();

  it('getEditorFields - noun currentWordType returns 4 fields', () => {
    const fields = strategy.getEditorFields(undefined, 'noun');
    expect(fields).toHaveLength(4);
  });

  it('getEditorFields - verb currentWordType returns 1 field (word_type only)', () => {
    const fields = strategy.getEditorFields(undefined, 'verb');
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('word_type');
  });

  it('getEditorFields - no args returns 1 field (word_type)', () => {
    const fields = strategy.getEditorFields();
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('word_type');
  });

  it('getEditorFields - card.word_type=noun and no currentWordType adds noun fields', () => {
    const fields = strategy.getEditorFields(makeCard('noun'));
    expect(fields).toHaveLength(4);
  });

  it('getEditorFields - currentWordType overrides card.word_type', () => {
    const fields = strategy.getEditorFields(makeCard('noun'), 'verb');
    expect(fields).toHaveLength(1);
  });

  it('getInitialFormData with noun card - includes grammar fields', () => {
    const data = strategy.getInitialFormData(makeCard('noun'));
    expect(data.word_type).toBe('noun');
    expect(data.article).toBe('der');
    expect(data.plural).toBe('die Hunde');
  });

  it('getInitialFormData without card - returns empty defaults', () => {
    const data = strategy.getInitialFormData();
    expect(data.germanWord).toBe('');
    expect(data.word_type).toBeUndefined();
    expect(data.article).toBe('');
    expect(data.plural).toBe('');
  });

  it('validateFields - noun with invalid article returns error', () => {
    const errors = strategy.validateFields({
      germanWord: '',
      translation: '',
      word_type: 'noun',
      article: 'le',
    });
    expect(errors.article).toBeDefined();
  });

  it('validateFields - non-noun returns no errors', () => {
    const errors = strategy.validateFields({
      germanWord: '',
      translation: '',
      word_type: 'verb',
    });
    expect(errors).toEqual({});
  });

  it('supports always returns true', () => {
    expect(strategy.supports()).toBe(true);
  });

  it('getType returns adaptive-card-editor', () => {
    expect(strategy.getType()).toBe('adaptive-card-editor');
  });
});
