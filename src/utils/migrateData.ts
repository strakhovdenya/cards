import { sampleCards } from '@/data/sampleCards';
import { ClientCardService } from '@/services/cardService';

// Предопределенные теги для разных типов слов
const generateTags = (germanWord: string, translation: string): string[] => {
  const tags: string[] = ['базовый'];

  // Определяем артикль и добавляем соответствующий тег
  if (germanWord.startsWith('der ')) tags.push('мужской род');
  else if (germanWord.startsWith('die ')) tags.push('женский род');
  else if (germanWord.startsWith('das ')) tags.push('средний род');

  // Добавляем тематические теги на основе немецкого слова и перевода
  const combinedText = `${germanWord} ${translation}`.toLowerCase();

  if (
    ['hund', 'katze', 'собака', 'кошка', 'животное'].some((word) =>
      combinedText.includes(word)
    )
  ) {
    tags.push('животные');
  }
  if (
    ['haus', 'schule', 'дом', 'школа', 'место'].some((word) =>
      combinedText.includes(word)
    )
  ) {
    tags.push('места');
  }
  if (
    ['familie', 'freund', 'liebe', 'семья', 'друг', 'любовь'].some((word) =>
      combinedText.includes(word)
    )
  ) {
    tags.push('семья и отношения');
  }
  if (
    ['arbeit', 'geld', 'работа', 'деньги', 'профессия'].some((word) =>
      combinedText.includes(word)
    )
  ) {
    tags.push('работа');
  }
  if (
    ['zeit', 'tag', 'время', 'день', 'час'].some((word) =>
      combinedText.includes(word)
    )
  ) {
    tags.push('время');
  }

  return tags;
};

export async function migrateSampleData(): Promise<void> {
  try {
    console.log('Начинаю миграцию данных...');

    // Получаем существующие карточки
    const existingCards = await ClientCardService.getCards();

    if (existingCards.length > 0) {
      console.log(
        `Найдено ${existingCards.length} существующих карточек. Миграция не требуется.`
      );
      return;
    }

    console.log(`Мигрирую ${sampleCards.length} карточек...`);

    for (const oldCard of sampleCards) {
      const tags = generateTags(oldCard.germanWord, oldCard.translation);

      await ClientCardService.createCard(
        oldCard.germanWord,
        oldCard.translation,
        tags
      );

      console.log(
        `Мигрирована карточка: ${oldCard.germanWord} -> ${oldCard.translation}`
      );
    }

    console.log('Миграция завершена успешно!');
  } catch (error) {
    console.error('Ошибка при миграции данных:', error);
    throw error;
  }
}

// Утилита для очистки всех карточек (для разработки)
export async function clearAllCards(): Promise<void> {
  try {
    const cards = await ClientCardService.getCards();

    for (const card of cards) {
      await ClientCardService.deleteCard(card.id);
    }

    console.log(`Удалено ${cards.length} карточек`);
  } catch (error) {
    console.error('Ошибка при очистке данных:', error);
    throw error;
  }
}

// Утилита для получения статистики
export async function getCardsStatistics(): Promise<void> {
  try {
    const stats = await ClientCardService.getCardStats();
    console.log('Статистика карточек:', stats);
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
  }
}
