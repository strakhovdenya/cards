import { describe, it, expect } from 'vitest';
import { NounBulkImportStrategy } from '@/strategies/NounBulkImportStrategy';
import type { Card } from '@/types';

function makeCard(germanWord: string): Card {
  return {
    id: '1',
    germanWord,
    translation: 'test',
    user_id: 'user1',
    tags: [],
    learned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('NounBulkImportStrategy.parseText', () => {
  const strategy = new NounBulkImportStrategy();

  it('parses noun with article and plural', () => {
    const result = strategy.parseText('der Mann, die Männer - мужчина', []);
    expect(result.cards).toHaveLength(1);
    const card = result.cards[0];
    expect(card.article).toBe('der');
    expect(card.plural).toBe('die Männer');
    expect(card.translation).toBe('мужчина');
  });

  it('parses noun with article only (no plural)', () => {
    const result = strategy.parseText('der Mann - мужчина', []);
    const card = result.cards[0];
    expect(card.article).toBe('der');
    expect(card.plural).toBeUndefined();
  });

  it('parses noun without article but with comma (simple plural)', () => {
    const result = strategy.parseText('Mann, Männer - мужчина', []);
    const card = result.cards[0];
    expect(card.article).toBeUndefined();
    expect(card.plural).toBe('Männer');
  });

  it('parses noun without article or comma', () => {
    const result = strategy.parseText('Mann - мужчина', []);
    const card = result.cards[0];
    expect(card.article).toBeUndefined();
    expect(card.plural).toBeUndefined();
  });

  it('word_type is always noun', () => {
    const result = strategy.parseText('der Mann - мужчина', []);
    expect(result.cards[0].word_type).toBe('noun');
  });

  it('normalizes unicode dashes', () => {
    const result = strategy.parseText('der Mann – мужчина', []);
    expect(result.cards).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('normalizes all supported unicode dash variants', () => {
    const dashes = ['‐', '‑', '‒', '–', '—', '−', '﹘', '﹣', '－'];
    for (const dash of dashes) {
      const result = strategy.parseText(`der Mann ${dash} мужчина`, []);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
    }
  });

  it('reports specific error for empty german word (not separator error)', () => {
    const result = strategy.parseText(' - мужчина', []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('пустое немецкое слово');
  });

  it('reports specific error for empty translation (not separator error)', () => {
    const result = strategy.parseText('der Mann - ', []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('пустой перевод');
  });

  it('reports error for line without separator', () => {
    const result = strategy.parseText('derMannohne', []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('не найден разделитель');
  });

  it('detects duplicates against existingCards', () => {
    const existing = [makeCard('der Mann')];
    const result = strategy.parseText(
      'der Mann - мужчина\ndie Frau - женщина',
      existing
    );
    expect(result.duplicates).toHaveLength(1);
    expect(result.newCards).toHaveLength(1);
  });

  it('skips empty lines', () => {
    const result = strategy.parseText(
      'der Mann - мужчина\n\ndie Frau - женщина',
      []
    );
    expect(result.cards).toHaveLength(2);
  });
});
