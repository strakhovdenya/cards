export {
  normalizeGermanWord,
  toNormalizedWordSet,
  isDuplicateGermanWord,
} from './germanWordUtils';

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
