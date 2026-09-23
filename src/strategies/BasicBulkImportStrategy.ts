import type {
  BulkImportStrategy,
  ParseResult,
  ParsedCard,
} from './BulkImportStrategy';
import type { Card } from '@/types';
import {
  isDuplicateGermanWord,
  extractGermanWords,
  toNormalizedWordSet,
} from '@/utils/cardUtils';

export class BasicBulkImportStrategy implements BulkImportStrategy {
  parseText(text: string, existingCards: Card[]): ParseResult {
    const lines = text.split('\n');
    const cards: ParsedCard[] = [];
    const errors: string[] = [];

    for (const [index, line] of lines.entries()) {
      // Нормализуем дефисы ДО trim, чтобы разделитель " - " находился корректно
      // даже если строка начинается/заканчивается пробелом рядом с дефисом
      const normalizedLine = line.replace(/[‐‑‒–—−﹘﹣－]/g, '-');
      const trimmedLine = normalizedLine.trim();

      const lineNumber = index + 1;

      // Пропускаем пустые строки
      if (!trimmedLine) continue;

      // Ищем разделитель " - " в нормализованной строке до trim —
      // иначе " - dog" после trim даёт "- dog" и разделитель не находится
      const separatorIndex = normalizedLine.indexOf(' - ');

      if (separatorIndex === -1) {
        errors.push(`Строка ${lineNumber}: не найден разделитель " - "`);
        continue;
      }

      const germanWord = normalizedLine.substring(0, separatorIndex).trim();
      const translation = normalizedLine.substring(separatorIndex + 3).trim();

      if (!germanWord) {
        errors.push(`Строка ${lineNumber}: пустое немецкое слово`);
        continue;
      }

      if (!translation) {
        errors.push(`Строка ${lineNumber}: пустой перевод`);
        continue;
      }

      cards.push({
        germanWord,
        translation,
        lineNumber,
      });
    }

    // Проверяем дубликаты
    const existingWordSet = toNormalizedWordSet(
      extractGermanWords(existingCards)
    );
    const duplicates: ParsedCard[] = [];
    const newCards: ParsedCard[] = [];

    for (const card of cards) {
      const isDuplicate = isDuplicateGermanWord(
        card.germanWord,
        existingWordSet
      );
      if (isDuplicate) {
        duplicates.push({ ...card, isDuplicate: true });
      } else {
        newCards.push({ ...card, isDuplicate: false });
      }
    }

    return { cards, errors, duplicates, newCards };
  }

  getGptPrompt(): string {
    return `мне надо следующие слова перевести на немецкий, ответ дать в формате
die Lampe, die Lampen - Лампа
die Tasche, die Taschen - Сумка
в ответе не должно быть пустых строк между строк ответов

вот слова на русском языке`;
  }

  getFormatExample(): string {
    return `Пример формата:
das Haus - дом
die Katze - кошка
der Hund - собака
laufen - бегать`;
  }

  getDisplayName(): string {
    return 'Обычные карточки';
  }

  getType(): string {
    return 'basic-bulk-import';
  }
}
