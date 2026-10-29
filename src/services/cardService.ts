import type {
  Card,
  CreateCardRequest,
  BulkCreateCardsRequest,
  UpdateCardRequest,
  CardFormData,
} from '@/types';
import { apiRequest } from '@/services/apiResponse';

// Базовый URL для API
const API_BASE_URL = '/api/cards';

interface ServiceOptions {
  guest?: boolean;
}

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

// Клиентский сервис для работы с карточками
export class ClientCardService {
  // Получить карточки текущего пользователя
  static async getCards(options?: ServiceOptions): Promise<Card[]> {
    return apiRequest<Card[]>(buildUrl(API_BASE_URL, options), {
      credentials: 'include', // Важно для передачи cookies с сессией
    });
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

    return apiRequest<Card>(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(cardData),
    });
  }

  // Массовое создание карточек
  static async createBulkCards(cards: CardFormData[]): Promise<Card[]> {
    const cardsData: CreateCardRequest[] = cards.map((card) => ({
      germanWord: card.germanWord,
      translation: card.translation,
      base_form: card.base_form,
      grammar_data: card.grammar_data,
      word_type: card.word_type,
      tagIds: card.tagIds ?? [],
    }));

    const bulkRequest: BulkCreateCardsRequest = {
      cards: cardsData,
    };

    return apiRequest<Card[]>(`${API_BASE_URL}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(bulkRequest),
    });
  }

  // Получить карточку по ID
  static async getCardById(
    cardId: string,
    options?: ServiceOptions
  ): Promise<Card> {
    return apiRequest<Card>(buildUrl(`${API_BASE_URL}/${cardId}`, options), {
      credentials: 'include',
    });
  }

  // Обновить карточку
  static async updateCard(
    cardId: string,
    updates: UpdateCardRequest
  ): Promise<Card> {
    return apiRequest<Card>(`${API_BASE_URL}/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
  }

  // Удалить карточку
  static async deleteCard(cardId: string): Promise<void> {
    await apiRequest<null>(`${API_BASE_URL}/${cardId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Пометить карточку как выученную/не выученную
  static async toggleLearnedStatus(
    cardId: string,
    learned: boolean
  ): Promise<Card> {
    return this.updateCard(cardId, { learned });
  }

  // Получить статистику карточек
  static async getCardStats(options?: ServiceOptions): Promise<{
    total: number;
    learned: number;
    unlearned: number;
  }> {
    const cards = await this.getCards(options);
    const learned = cards.filter((card) => card.learned).length;

    return {
      total: cards.length,
      learned,
      unlearned: cards.length - learned,
    };
  }
}

// ClientTagService перенесен в отдельный файл src/services/tagService.ts
