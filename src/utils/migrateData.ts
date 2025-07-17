import { sampleCards } from '@/data/sampleCards';
import { ClientCardService } from '@/services/cardService';
import { ClientTagService } from '@/services/tagService';

// Интерфейс для sample карточек (с тегами как строки)
interface SampleCard {
  id: string;
  germanWord: string;
  translation: string;
  user_id: string;
  tags: string[];
  learned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

// Флаг для предотвращения повторного запуска миграции
let migrationInProgress = false;

export async function migrateSampleData(): Promise<void> {
  if (migrationInProgress) {
    console.log('Миграция уже выполняется, пропускаю...');
    return;
  }

  migrationInProgress = true;
  try {
    console.log('Начинаю миграцию данных...');

    // Получаем существующие карточки и теги
    const existingCards = await ClientCardService.getCards();
    const existingTags = await ClientTagService.getTags();

    if (existingCards.length > 0) {
      console.log(
        `Найдено ${existingCards.length} существующих карточек. Миграция не требуется.`
      );
      return;
    }

    if (existingTags.length > 0) {
      console.log(
        `Найдено ${existingTags.length} существующих тегов. Миграция уже была выполнена ранее.`
      );
      return;
    }

    console.log(`Мигрирую ${sampleCards.length} карточек...`);

    // Создаем мапу для быстрого поиска тегов (изначально пустая для новых пользователей)
    const tagMap = new Map(existingTags.map((tag) => [tag.name, tag.id]));

    for (const oldCard of sampleCards as SampleCard[]) {
      const tagNames = generateTags(oldCard.germanWord, oldCard.translation);

      // Создаем отсутствующие теги и получаем их ID
      const tagIds: string[] = [];
      for (const tagName of tagNames) {
        let tagId = tagMap.get(tagName);
        if (!tagId) {
          try {
            // Создаем новый тег
            const newTag = await ClientTagService.createTag(tagName);
            tagId = newTag.id;
            tagMap.set(tagName, tagId);
          } catch (error) {
            // Если тег уже существует (409 Conflict), получаем все теги заново
            if (
              error instanceof Error &&
              error.message.includes('already exists')
            ) {
              console.log(
                `Тег "${tagName}" уже существует, получаю актуальный список...`
              );
              const updatedTags = await ClientTagService.getTags();
              const existingTag = updatedTags.find(
                (tag) => tag.name === tagName
              );
              if (existingTag) {
                tagId = existingTag.id;
                tagMap.set(tagName, tagId);
              } else {
                throw new Error(
                  `Не удалось найти тег "${tagName}" после обновления списка`
                );
              }
            } else {
              throw error;
            }
          }
        }
        tagIds.push(tagId);
      }

      await ClientCardService.createCard(
        oldCard.germanWord,
        oldCard.translation,
        tagIds
      );

      console.log(
        `Мигрирована карточка: ${oldCard.germanWord} -> ${oldCard.translation} (теги: ${tagNames.join(', ')})`
      );
    }

    console.log('Миграция завершена успешно!');
  } catch (error) {
    console.error('Ошибка при миграции данных:', error);
    throw error;
  } finally {
    migrationInProgress = false;
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
