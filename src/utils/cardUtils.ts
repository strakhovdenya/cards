export {
  normalizeGermanWord,
  toNormalizedWordSet,
  isDuplicateGermanWord,
} from './germanWordUtils';

/**
 * Получает массив немецких слов из массива карточек
 * @param cards - массив карточек
 * @returns массив немецких слов
 */
export function extractGermanWords(
  cards: Array<{ germanWord: string }>
): string[] {
  return cards.map((card) => card.germanWord);
}
