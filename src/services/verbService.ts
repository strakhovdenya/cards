import type {
  Verb,
  CreateVerbRequest,
  UpdateVerbRequest,
  VerbConjugation,
  BulkCreateVerbsRequest,
} from '@/types';
import { apiFetch, apiRequest, parseApiResponse } from '@/services/apiResponse';

interface ServiceOptions {
  guest?: boolean;
}

// Базовый URL для API
const API_BASE_URL = '/api/verbs';

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

// Клиентский сервис для работы с глаголами
export class ClientVerbService {
  // Получить глаголы текущего пользователя
  static async getVerbs(options?: ServiceOptions): Promise<Verb[]> {
    return apiRequest<Verb[]>(buildUrl(API_BASE_URL, options), {
      credentials: 'include', // Важно для передачи cookies с сессией
    });
  }

  // Создать новый глагол
  static async createVerb(verbData: CreateVerbRequest): Promise<Verb> {
    return apiRequest<Verb>(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(verbData),
    });
  }

  // Массовое создание глаголов
  static async createBulkVerbs(verbs: CreateVerbRequest[]): Promise<Verb[]> {
    const bulkRequest: BulkCreateVerbsRequest = {
      verbs,
    };

    return apiRequest<Verb[]>(`${API_BASE_URL}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(bulkRequest),
    });
  }

  // Получить глагол по ID
  static async getVerbById(
    id: string,
    options?: ServiceOptions
  ): Promise<Verb | null> {
    try {
      const response = await apiFetch(
        buildUrl(`${API_BASE_URL}/${id}`, options),
        {
          credentials: 'include',
        }
      );

      if (response.status === 404) {
        return null;
      }

      return parseApiResponse<Verb>(response, false);
    } catch (error) {
      console.error('Error in getVerbById:', error);
      throw error;
    }
  }

  // Обновить глагол
  static async updateVerb(
    id: string,
    updates: UpdateVerbRequest
  ): Promise<Verb> {
    return apiRequest<Verb>(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
  }

  // Удалить глагол
  static async deleteVerb(id: string): Promise<void> {
    await apiRequest<null>(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Получить случайный глагол для тренировки
  static async getRandomVerb(options?: ServiceOptions): Promise<Verb | null> {
    try {
      const response = await apiFetch(
        buildUrl(`${API_BASE_URL}/random`, options),
        {
          credentials: 'include',
        }
      );

      if (response.status === 404) {
        return null;
      }

      return parseApiResponse<Verb>(response, false);
    } catch (error) {
      console.error('Error in getRandomVerb:', error);
      throw error;
    }
  }

  // Получить глаголы по статусу изучения
  static async getVerbsByLearnedStatus(
    learned: boolean,
    options?: ServiceOptions
  ): Promise<Verb[]> {
    return apiRequest<Verb[]>(
      buildUrl(`${API_BASE_URL}/by-learned-status?learned=${learned}`, options),
      {
        credentials: 'include',
      }
    );
  }

  // Поиск глаголов по инфинитиву
  static async searchVerbs(
    query: string,
    options?: ServiceOptions
  ): Promise<Verb[]> {
    return apiRequest<Verb[]>(
      buildUrl(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`,
        options
      ),
      {
        credentials: 'include',
      }
    );
  }

  // Пометить глагол как изученный/не изученный
  static async toggleLearnedStatus(
    id: string,
    learned: boolean
  ): Promise<Verb> {
    return this.updateVerb(id, { learned });
  }

  // Получить статистику глаголов
  static async getVerbStats(): Promise<{
    total: number;
    learned: number;
    unlearned: number;
  }> {
    const verbs = await this.getVerbs();
    const learned = verbs.filter((verb) => verb.learned).length;

    return {
      total: verbs.length,
      learned,
      unlearned: verbs.length - learned,
    };
  }
}

// Утилитарные функции
export const getRandomPerson = (): string => {
  const persons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];
  return persons[Math.floor(Math.random() * persons.length)] ?? 'ich';
};

export const getConjugationForPerson = (
  verb: Verb,
  person: string
): VerbConjugation | null => {
  return verb.conjugations.find((conj) => conj.person === person) ?? null;
};

// Обратная совместимость - экспортируем старые функции
export const getVerbs = ClientVerbService.getVerbs;
export const createVerb = ClientVerbService.createVerb;
export const getVerbById = ClientVerbService.getVerbById;
export const updateVerb = ClientVerbService.updateVerb;
export const deleteVerb = ClientVerbService.deleteVerb;
export const getRandomVerb = ClientVerbService.getRandomVerb;
export const getVerbsByLearnedStatus =
  ClientVerbService.getVerbsByLearnedStatus;
export const searchVerbs = ClientVerbService.searchVerbs;
