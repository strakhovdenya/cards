import type {
  BulkImportStrategy,
  ParseResult,
  ParsedCard,
} from './BulkImportStrategy';
import type { Card } from '@/types';
import { isDuplicateGermanWord, extractGermanWords } from '@/utils/cardUtils';

export interface ParsedNounCard extends ParsedCard {
  word_type: 'noun';
  base_form?: string;
  article?: string;
  plural?: string;
}

export interface NounParseResult extends ParseResult {
  cards: ParsedNounCard[];
  duplicates: ParsedNounCard[];
  newCards: ParsedNounCard[];
}

export class NounBulkImportStrategy implements BulkImportStrategy {
  parseText(text: string, existingCards: Card[]): NounParseResult {
    const lines = text.split('\n');
    const cards: ParsedNounCard[] = [];
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

      // Парсим существительное - извлекаем артикль, базовую форму и множественное число
      const { base_form, article, plural } = this.parseNoun(germanWord);

      cards.push({
        germanWord,
        translation,
        lineNumber,
        word_type: 'noun',
        base_form,
        article,
        plural,
      });
    });

    // Проверяем дубликаты
    const existingGermanWords = extractGermanWords(existingCards);
    const duplicates: ParsedNounCard[] = [];
    const newCards: ParsedNounCard[] = [];

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

  private parseNoun(germanWord: string): {
    base_form?: string;
    article?: string;
    plural?: string;
  } {
    // Пытаемся извлечь артикль из начала слова
    const articleMatch = germanWord.match(/^(der|die|das)\s+(.+)$/i);

    if (articleMatch) {
      const article = articleMatch[1].toLowerCase();

      // Проверяем, есть ли множественное число в формате "der Mann, die Männer"
      const pluralMatch = germanWord.match(
        /^(der|die|das)\s+([^,]+),\s*(der|die|das)\s+(.+)$/i
      );

      if (pluralMatch) {
        return {
          base_form: germanWord,
          article: article,
          plural: `${pluralMatch[3].toLowerCase()} ${pluralMatch[4]}`,
        };
      }

      return {
        base_form: germanWord,
        article: article,
      };
    }

    // Если нет артикля, но есть запятая, возможно это формат "Mann, Männer"
    const simplePluralMatch = germanWord.match(/^([^,]+),\s*(.+)$/);
    if (simplePluralMatch) {
      return {
        base_form: germanWord,
        plural: simplePluralMatch[2],
      };
    }

    // Если ничего не найдено, возвращаем как есть
    return {
      base_form: germanWord,
    };
  }

  getGptPrompt(): string {
    return `## КРИТИЧЕСКИ ВАЖНО

Ты ДОЛЖЕН отвечать ТОЛЬКО в указанном формате. НЕ используй:
- Списки
- Текстовые описания  
- Разделители типа "-" или "→"
- Дополнительные комментарии
- Объяснения

ТОЛЬКО указанный формат!

## Инструкция

Ты — эксперт по немецкому языку. Переведи следующие русские существительные на немецкий язык, указав артикль (der/die/das), единственное и множественное число.

## Формат ответа

Отвечай ТОЛЬКО в следующем формате, без какого-либо дополнительного текста:

der Mann, die Männer - мужчина
die Frau, die Frauen - женщина
das Kind, die Kinder - ребенок
die Lampe, die Lampen - лампа
die Tasche, die Taschen - сумка

## Правила

1. Всегда указывай артикль (der/die/das)
2. Всегда указывай множественное число
3. Используй формат: "артикль единственное_число, артикль множественное_число - русский_перевод"
4. Каждое существительное на отдельной строке
5. НЕ добавляй пустые строки между строками
6. НЕ используй нумерацию или списки

## НЕПРАВИЛЬНЫЕ форматы (НЕ используй):

❌ Список:
- der Mann - мужчина
- die Frau - женщина

❌ Текст с разделителями:
der Mann → мужчина → die Männer

❌ Простой список:
Mann, Frau, Kind, Lampe

## Правильный формат (ИСПОЛЬЗУЙ):

✅ ТОЛЬКО указанный формат:
der Mann, die Männer - мужчина
die Frau, die Frauen - женщина
das Kind, die Kinder - ребенок

## ФИНАЛЬНОЕ ПРЕДУПРЕЖДЕНИЕ

⚠️ **ВАЖНО**: Твой ответ ДОЛЖЕН содержать только строки в указанном формате.  
⚠️ НЕ добавляй никакого текста до или после.  
⚠️ НЕ используй markdown разметку.  
⚠️ НЕ добавляй комментарии типа "Вот перевод:" или "Ответ:".  
⚠️ ТОЛЬКО чистый список в указанном формате!

## Запрос

Переведи следующие русские существительные на немецкий язык в указанном формате:

[СПИСОК_РУССКИХ_СУЩЕСТВИТЕЛЬНЫХ]`;
  }

  getFormatExample(): string {
    return `Пример формата для существительных:
der Mann, die Männer - мужчина
die Frau, die Frauen - женщина
das Kind, die Kinder - ребенок
die Lampe, die Lampen - лампа
die Tasche, die Taschen - сумка

Формат: "артикль единственное_число, артикль множественное_число - русский_перевод"`;
  }

  getDisplayName(): string {
    return 'Существительные';
  }

  getType(): string {
    return 'noun-bulk-import';
  }
}
