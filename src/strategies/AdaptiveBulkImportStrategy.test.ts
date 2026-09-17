import { describe, it, expect } from 'vitest';
import { AdaptiveBulkImportStrategy } from '@/strategies/AdaptiveBulkImportStrategy';
import { BasicBulkImportStrategy } from '@/strategies/BasicBulkImportStrategy';
import { NounBulkImportStrategy } from '@/strategies/NounBulkImportStrategy';

describe('AdaptiveBulkImportStrategy', () => {
  const adaptive = new AdaptiveBulkImportStrategy();
  const basic = new BasicBulkImportStrategy();

  it('parseText delegates to BasicBulkImportStrategy', () => {
    const text = 'Hund - собака\nKatze - кошка';
    expect(adaptive.parseText(text, [])).toEqual(basic.parseText(text, []));
  });

  it('getGptPrompt matches BasicBulkImportStrategy', () => {
    expect(adaptive.getGptPrompt()).toBe(basic.getGptPrompt());
  });

  it('getFormatExample matches BasicBulkImportStrategy', () => {
    expect(adaptive.getFormatExample()).toBe(basic.getFormatExample());
  });

  it('getBasicStrategy returns BasicBulkImportStrategy instance', () => {
    expect(adaptive.getBasicStrategy()).toBeInstanceOf(BasicBulkImportStrategy);
  });

  it('getNounStrategy returns NounBulkImportStrategy instance', () => {
    expect(adaptive.getNounStrategy()).toBeInstanceOf(NounBulkImportStrategy);
  });

  it('getType returns adaptive-bulk-import', () => {
    expect(adaptive.getType()).toBe('adaptive-bulk-import');
  });

  it('getDisplayName returns display name', () => {
    expect(adaptive.getDisplayName()).toBe('Универсальный импорт');
  });
});
