import type {
  BulkImportStrategy,
  ParseResult,
  ParsedCard,
} from './BulkImportStrategy';
import type { Card } from '@/types';
import { isDuplicateGermanWord, extractGermanWords } from '@/utils/cardUtils';

export class BasicBulkImportStrategy implements BulkImportStrategy {
  parseText(text: string, existingCards: Card[]): ParseResult {
    const lines = text.split('\n');
    const cards: ParsedCard[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      let trimmedLine = line.trim();
      // Заменяем все виды дефисов на обычный дефис
      trimmedLine = trimmedLine.replace(/[‐‑‒–—−﹘﹣－]/g, '-');

      const lineNumber = index + 1;

      // Пропускаем пустые строки
      if (!trimmedLine) return;

      // Ищем разделитель " - "
      const separatorIndex = trimmedLine.indexOf(' - ');

      if (separatorIndex === -1) {
        errors.push(`Строка ${lineNumber}: не найден разделитель " - "`);
        return;
      }

      const germanWord = trimmedLine.substring(0, separatorIndex).trim();
      const translation = trimmedLine.substring(separatorIndex + 3).trim();

      if (!germanWord) {
        errors.push(`Строка ${lineNumber}: пустое немецкое слово`);
        return;
      }

      if (!translation) {
        errors.push(`Строка ${lineNumber}: пустой перевод`);
        return;
      }

      cards.push({
        germanWord,
        base_form: germanWord,
        word_type: 'other',
        grammar_data: {},
        translation,
        lineNumber,
      });
    });

    // Проверяем дубликаты
    const existingGermanWords = extractGermanWords(existingCards);
    const duplicates: ParsedCard[] = [];
    const newCards: ParsedCard[] = [];

    cards.forEach((card) => {
      const isDuplicate = isDuplicateGermanWord(
        card.germanWord,
        existingGermanWords
      );
      if (isDuplicate) {
        duplicates.push({ ...card, isDuplicate: true });
      } else {
        newCards.push({ ...card, isDuplicate: false });
      }
    });

    return { cards, errors, duplicates, newCards };
  }

  getGptPrompt(): string {
    return `мне надо следующие слова перевести на немецкий, 
    ответ дать в формате 
    normal - нормальный; 
    Wie geht es dir? - как дела?
    обычно в ответе не должно быть пустых строк между строк ответов вот слова`;
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
