import { describe, it, expect } from 'vitest';
import { BasicBulkImportStrategy } from '@/strategies/BasicBulkImportStrategy';
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

describe('BasicBulkImportStrategy.parseText', () => {
  const strategy = new BasicBulkImportStrategy();

  it('parses valid lines', () => {
    const result = strategy.parseText('Hund - собака\nKatze - кошка', []);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].germanWord).toBe('Hund');
    expect(result.cards[0].translation).toBe('собака');
    expect(result.errors).toHaveLength(0);
  });

  it('skips empty lines', () => {
    const result = strategy.parseText('Hund - собака\n\nKatze - кошка', []);
    expect(result.cards).toHaveLength(2);
  });

  it('reports error for line without separator', () => {
    const result = strategy.parseText('Hundohne', []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('не найден разделитель');
  });

  it('normalizes unicode en-dash', () => {
    const result = strategy.parseText('Hund – собака', []);
    expect(result.cards).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('normalizes unicode em-dash', () => {
    const result = strategy.parseText('Katze — кошка', []);
    expect(result.cards).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('normalizes all supported unicode dash variants', () => {
    const dashes = ['‐', '‑', '‒', '–', '—', '−', '﹘', '﹣', '－'];
    for (const dash of dashes) {
      const result = strategy.parseText(`Hund ${dash} собака`, []);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(1);
    }
  });

  it('reports specific error for empty german word (not separator error)', () => {
    const result = strategy.parseText(' - собака', []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('пустое немецкое слово');
  });

  it('reports specific error for empty translation (not separator error)', () => {
    const result = strategy.parseText('Hund - ', []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('пустой перевод');
  });

  it('detects duplicates against existingCards', () => {
    const existing = [makeCard('Hund')];
    const result = strategy.parseText('Hund - собака\nKatze - кошка', existing);
    expect(result.duplicates).toHaveLength(1);
    expect(result.newCards).toHaveLength(1);
    expect(result.duplicates[0].germanWord).toBe('Hund');
  });

  it('duplicate detection is case-insensitive', () => {
    const existing = [makeCard('hund')];
    const result = strategy.parseText('Hund - собака', existing);
    expect(result.duplicates).toHaveLength(1);
  });

  it('new cards have isDuplicate false', () => {
    const result = strategy.parseText('Wolf - волк', []);
    expect(result.newCards[0].isDuplicate).toBe(false);
  });

  it('includes line numbers in errors', () => {
    const result = strategy.parseText('ok - ok\nbadline', []);
    expect(result.errors[0]).toContain('2');
  });
});
