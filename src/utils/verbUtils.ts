/**
 * Нормализует немецкое слово для сравнения:
 * - Удаляет пробелы в начале и конце
 * - Удаляет запятые
 * - Приводит к нижнему регистру
 * @param word - немецкое слово для нормализации
 * @returns нормализованное слово
 */
export function normalizeGermanWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/,/g, '') // Удаляем запятые
    .replace(/\s+/g, ''); // Удаляем все пробелы
}

/**
 * Строит Set нормализованных слов для быстрой проверки дубликатов
 * @param words - массив немецких слов
 * @returns Set нормализованных слов
 */
export function toNormalizedWordSet(words: string[]): Set<string> {
  return new Set(words.map(normalizeGermanWord));
}

/**
 * Проверяет, является ли слово дубликатом среди существующих глаголов
 * @param newWord - новое слово для проверки
 * @param existingNormalizedWords - Set нормализованных существующих слов
 * @returns true если слово является дубликатом
 */
export function isDuplicateGermanWord(
  newWord: string,
  existingNormalizedWords: Set<string>
): boolean {
  return existingNormalizedWords.has(normalizeGermanWord(newWord));
}

/**
 * Получает массив немецких слов из массива глаголов
 * @param verbs - массив глаголов
 * @returns массив немецких слов
 */
export function extractGermanWords(
  verbs: Array<{ infinitive: string }>
): string[] {
  return verbs.map((verb) => verb.infinitive);
}
