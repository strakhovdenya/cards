import type {
  Card,
  CreateCardRequest,
  BulkCreateCardsRequest,
  BulkCardFailure,
  UpdateCardRequest,
  CardFormData,
} from '@/types';
import { apiRequest } from '@/services/apiResponse';
import {
  requestMutation,
  type MutationResult,
  type PartialDetector,
} from '@/services/mutationResult';

// Базовый URL для API
const API_BASE_URL = '/api/cards';

interface ServiceOptions {
  guest?: boolean;
}

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

const jsonInit = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify(payload),
});

const createCardInit = (
  germanWord: string,
  translation: string,
  tagIds?: string[]
): RequestInit => {
  const cardData: CreateCardRequest = {
    germanWord,
    translation,
    tagIds: tagIds ?? [],
  };
  return jsonInit('POST', cardData);
};

const createBulkCardsInit = (cards: CardFormData[]): RequestInit => {
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
  return jsonInit('POST', bulkRequest);
};

const DELETE_INIT: RequestInit = {
  method: 'DELETE',
  credentials: 'include',
};

// POST /api/cards сообщает tagsAttached: false, если карточка создана без тегов
const detectTagsNotAttached: PartialDetector = (body) =>
  body.tagsAttached === false ? { kind: 'tagsNotAttached' } : null;

// POST /api/cards/bulk перечисляет в failed[] позиции, применённые не полностью
const detectBulkFailures: PartialDetector = (body) => {
  const { failed } = body;
  if (!Array.isArray(failed) || failed.length === 0) return null;
  return { kind: 'bulkFailed', failed: failed as BulkCardFailure[] };
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
    return apiRequest<Card>(
      API_BASE_URL,
      createCardInit(germanWord, translation, tagIds)
    );
  }

  // Создать карточку и получить исход: partial — создана без тегов
  static async createCardWithResult(
    germanWord: string,
    translation: string,
    tagIds?: string[]
  ): Promise<MutationResult<Card>> {
    return requestMutation<Card>(
      API_BASE_URL,
      createCardInit(germanWord, translation, tagIds),
      detectTagsNotAttached
    );
  }

  // Массовое создание карточек
  static async createBulkCards(cards: CardFormData[]): Promise<Card[]> {
    return apiRequest<Card[]>(
      `${API_BASE_URL}/bulk`,
      createBulkCardsInit(cards)
    );
  }

  // Массовое создание с исходом: partial — data содержит созданные карточки,
  // details.failed — несозданные или созданные не полностью позиции с причинами.
  // Если не создано ничего, сервер всё равно отвечает 201: исход остаётся
  // partial с пустым data, чтобы перечень причин не потерялся
  static async createBulkCardsWithResult(
    cards: CardFormData[]
  ): Promise<MutationResult<Card[]>> {
    return requestMutation<Card[]>(
      `${API_BASE_URL}/bulk`,
      createBulkCardsInit(cards),
      detectBulkFailures
    );
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
    return apiRequest<Card>(
      `${API_BASE_URL}/${cardId}`,
      jsonInit('PUT', updates)
    );
  }

  static async updateCardWithResult(
    cardId: string,
    updates: UpdateCardRequest
  ): Promise<MutationResult<Card>> {
    return requestMutation<Card>(
      `${API_BASE_URL}/${cardId}`,
      jsonInit('PUT', updates)
    );
  }

  // Удалить карточку
  static async deleteCard(cardId: string): Promise<void> {
    await apiRequest<null>(`${API_BASE_URL}/${cardId}`, DELETE_INIT);
  }

  static async deleteCardWithResult(
    cardId: string
  ): Promise<MutationResult<null>> {
    return requestMutation<null>(`${API_BASE_URL}/${cardId}`, DELETE_INIT);
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
