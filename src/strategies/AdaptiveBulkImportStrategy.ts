import type { BulkImportStrategy, ParseResult } from './BulkImportStrategy';
import type { Card } from '@/types';
import { BasicBulkImportStrategy } from './BasicBulkImportStrategy';
import { NounBulkImportStrategy } from './NounBulkImportStrategy';

export class AdaptiveBulkImportStrategy implements BulkImportStrategy {
  private basicStrategy = new BasicBulkImportStrategy();
  private nounStrategy = new NounBulkImportStrategy();

  parseText(text: string, existingCards: Card[]): ParseResult {
    // По умолчанию используем базовую стратегию
    return this.basicStrategy.parseText(text, existingCards);
  }

  getGptPrompt(): string {
    // По умолчанию возвращаем промпт для обычных карточек
    return this.basicStrategy.getGptPrompt();
  }

  getFormatExample(): string {
    // По умолчанию возвращаем пример для обычных карточек
    return this.basicStrategy.getFormatExample();
  }

  getDisplayName(): string {
    return 'Универсальный импорт';
  }

  getType(): string {
    return 'adaptive-bulk-import';
  }

  // Методы для получения конкретных стратегий
  getBasicStrategy(): BasicBulkImportStrategy {
    return this.basicStrategy;
  }

  getNounStrategy(): NounBulkImportStrategy {
    return this.nounStrategy;
  }
}
