import { describe, it, expect } from 'vitest';
import { NounCardEditorStrategy } from '@/strategies/NounCardEditorStrategy';
import type { Card } from '@/types';

function makeNounCard(): Card {
  return {
    id: '1',
    germanWord: 'Mann',
    translation: 'мужчина',
    user_id: 'user1',
    tags: [],
    learned: false,
    word_type: 'noun',
    base_form: 'der Mann',
    grammar_data: { article: 'der', plural: 'die Männer' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('NounCardEditorStrategy', () => {
  const strategy = new NounCardEditorStrategy();

  it('getEditorFields returns 4 fields', () => {
    const fields = strategy.getEditorFields();
    expect(fields).toHaveLength(4);
  });

  it('getEditorFields - first field is word_type', () => {
    const fields = strategy.getEditorFields();
    expect(fields[0].name).toBe('word_type');
    expect(fields[0].type).toBe('select');
  });

  it('getEditorFields - includes article select field', () => {
    const fields = strategy.getEditorFields();
    const articleField = fields.find((f) => f.name === 'article');
    expect(articleField).toBeDefined();
    expect(articleField?.options).toEqual(['der', 'die', 'das']);
  });

  it('getInitialFormData with noun card - extracts grammar_data', () => {
    const data = strategy.getInitialFormData(makeNounCard());
    expect(data.germanWord).toBe('Mann');
    expect(data.translation).toBe('мужчина');
    expect(data.word_type).toBe('noun');
    expect(data.base_form).toBe('der Mann');
    expect(data.article).toBe('der');
    expect(data.plural).toBe('die Männer');
  });

  it('getInitialFormData without card - defaults word_type to noun', () => {
    const data = strategy.getInitialFormData();
    expect(data.word_type).toBe('noun');
    expect(data.germanWord).toBe('');
    expect(data.article).toBe('');
    expect(data.plural).toBe('');
  });

  it('validateFields - valid article passes without error', () => {
    const errors = strategy.validateFields({
      germanWord: '',
      translation: '',
      word_type: 'noun',
      article: 'der',
    });
    expect(errors.article).toBeUndefined();
  });

  it('validateFields - invalid article returns error message', () => {
    const errors = strategy.validateFields({
      germanWord: '',
      translation: '',
      word_type: 'noun',
      article: 'le',
    });
    expect(errors.article).toBe('Артикль должен быть der, die или das');
  });

  it('validateFields - all three valid articles pass', () => {
    for (const article of ['der', 'die', 'das']) {
      const errors = strategy.validateFields({
        germanWord: '',
        translation: '',
        word_type: 'noun',
        article,
      });
      expect(errors.article).toBeUndefined();
    }
  });

  it('supports returns true for noun card', () => {
    expect(strategy.supports(makeNounCard())).toBe(true);
  });

  it('supports returns false for non-noun card', () => {
    const card: Card = { ...makeNounCard(), word_type: 'verb' };
    expect(strategy.supports(card)).toBe(false);
  });

  it('getType returns noun-card-editor', () => {
    expect(strategy.getType()).toBe('noun-card-editor');
  });
});
