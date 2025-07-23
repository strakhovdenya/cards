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
 * Проверяет, является ли слово дубликатом среди существующих глаголов
 * @param newWord - новое слово для проверки
 * @param existingWords - массив существующих слов
 * @returns true если слово является дубликатом
 */
export function isDuplicateGermanWord(
  newWord: string,
  existingWords: string[]
): boolean {
  const normalizedNewWord = normalizeGermanWord(newWord);

  return existingWords.some(
    (existingWord) => normalizeGermanWord(existingWord) === normalizedNewWord
  );
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
