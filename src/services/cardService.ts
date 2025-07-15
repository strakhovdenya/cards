import type {
  Card,
  CreateCardRequest,
  BulkCreateCardsRequest,
  UpdateCardRequest,
  ApiResponse,
  CardFormData,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
} from '@/types';

// Базовый URL для API
const API_BASE_URL = '/api/cards';

// Утилита для обработки ответов API
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = (await response.json()) as ApiResponse<null>;
    throw new Error(errorData.error ?? 'Ошибка API');
  }

  const data = (await response.json()) as ApiResponse<T>;
  if (data.error) {
    throw new Error(data.error);
  }

  return data.data!;
}

// Клиентский сервис для работы с карточками
export class ClientCardService {
  // Получить все карточки (пока без фильтрации по пользователю)
  static async getCards(userId?: string): Promise<Card[]> {
    const url = userId
      ? `${API_BASE_URL}?user_id=${encodeURIComponent(userId)}`
      : API_BASE_URL;

    const response = await fetch(url);
    return handleApiResponse<Card[]>(response);
  }

  // Создать новую карточку (упрощенная версия)
  static async createCard(
    germanWord: string,
    translation: string,
    tagIds?: string[]
  ): Promise<Card> {
    const cardData: CreateCardRequest = {
      germanWord,
      translation,
      tagIds: tagIds ?? [],
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardData),
    });
    return handleApiResponse<Card>(response);
  }

  // Массовое создание карточек
  static async createBulkCards(cards: CardFormData[]): Promise<Card[]> {
    const cardsData: CreateCardRequest[] = cards.map((card) => ({
      germanWord: card.germanWord,
      translation: card.translation,
      tagIds: card.tagIds ?? [],
    }));

    const bulkRequest: BulkCreateCardsRequest = {
      cards: cardsData,
    };

    const response = await fetch(`${API_BASE_URL}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bulkRequest),
    });

    return handleApiResponse<Card[]>(response);
  }

  // Получить карточку по ID
  static async getCardById(cardId: string): Promise<Card> {
    const response = await fetch(`${API_BASE_URL}/${cardId}`);
    return handleApiResponse<Card>(response);
  }

  // Обновить карточку
  static async updateCard(
    cardId: string,
    updates: UpdateCardRequest
  ): Promise<Card> {
    const response = await fetch(`${API_BASE_URL}/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return handleApiResponse<Card>(response);
  }

  // Удалить карточку
  static async deleteCard(cardId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${cardId}`, {
      method: 'DELETE',
    });
    await handleApiResponse<null>(response);
  }

  // Пометить карточку как выученную/не выученную
  static async toggleLearnedStatus(
    cardId: string,
    learned: boolean
  ): Promise<Card> {
    return this.updateCard(cardId, { learned });
  }

  // Получить статистику карточек
  static async getCardStats(): Promise<{
    total: number;
    learned: number;
    unlearned: number;
  }> {
    const cards = await this.getCards();
    const learned = cards.filter((card) => card.learned).length;

    return {
      total: cards.length,
      learned,
      unlearned: cards.length - learned,
    };
  }
}

// Клиентский сервис для работы с тегами
export class ClientTagService {
  private static readonly API_BASE_URL = '/api/tags';

  // Получить все теги пользователя
  static async getTags(userId?: string): Promise<Tag[]> {
    const url = userId
      ? `${this.API_BASE_URL}?user_id=${encodeURIComponent(userId)}`
      : this.API_BASE_URL;

    const response = await fetch(url);
    return handleApiResponse<Tag[]>(response);
  }

  // Создать новый тег
  static async createTag(name: string, color?: string): Promise<Tag> {
    const tagData: CreateTagRequest = {
      name,
      color: color ?? '#2196f3',
    };

    const response = await fetch(this.API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tagData),
    });
    return handleApiResponse<Tag>(response);
  }

  // Получить тег по ID
  static async getTagById(tagId: string): Promise<Tag> {
    const response = await fetch(`${this.API_BASE_URL}/${tagId}`);
    return handleApiResponse<Tag>(response);
  }

  // Обновить тег
  static async updateTag(
    tagId: string,
    updates: UpdateTagRequest
  ): Promise<Tag> {
    const response = await fetch(`${this.API_BASE_URL}/${tagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return handleApiResponse<Tag>(response);
  }

  // Удалить тег
  static async deleteTag(tagId: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/${tagId}`, {
      method: 'DELETE',
    });
    await handleApiResponse<null>(response);
  }
}
