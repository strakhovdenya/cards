import type {
  Verb,
  CreateVerbRequest,
  UpdateVerbRequest,
  VerbConjugation,
  ApiResponse,
  BulkCreateVerbsRequest,
} from '@/types';

interface ServiceOptions {
  guest?: boolean;
}

// Базовый URL для API
const API_BASE_URL = '/api/verbs';

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

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

// Клиентский сервис для работы с глаголами
export class ClientVerbService {
  // Получить глаголы текущего пользователя
  static async getVerbs(options?: ServiceOptions): Promise<Verb[]> {
    const response = await fetch(buildUrl(API_BASE_URL, options), {
      credentials: 'include', // Важно для передачи cookies с сессией
    });
    return handleApiResponse<Verb[]>(response);
  }

  // Создать новый глагол
  static async createVerb(verbData: CreateVerbRequest): Promise<Verb> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(verbData),
    });
    return handleApiResponse<Verb>(response);
  }

  // Массовое создание глаголов
  static async createBulkVerbs(verbs: CreateVerbRequest[]): Promise<Verb[]> {
    const bulkRequest: BulkCreateVerbsRequest = {
      verbs,
    };

    const response = await fetch(`${API_BASE_URL}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(bulkRequest),
    });

    return handleApiResponse<Verb[]>(response);
  }

  // Получить глагол по ID
  static async getVerbById(
    id: string,
    options?: ServiceOptions
  ): Promise<Verb | null> {
    try {
      const response = await fetch(buildUrl(`${API_BASE_URL}/${id}`, options), {
        credentials: 'include',
      });

      if (response.status === 404) {
        return null;
      }

      return handleApiResponse<Verb>(response);
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
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return handleApiResponse<Verb>(response);
  }

  // Удалить глагол
  static async deleteVerb(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await handleApiResponse<null>(response);
  }

  // Получить случайный глагол для тренировки
  static async getRandomVerb(options?: ServiceOptions): Promise<Verb | null> {
    try {
      const response = await fetch(
        buildUrl(`${API_BASE_URL}/random`, options),
        {
          credentials: 'include',
        }
      );

      if (response.status === 404) {
        return null;
      }

      return handleApiResponse<Verb>(response);
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
    const response = await fetch(
      buildUrl(`${API_BASE_URL}/by-learned-status?learned=${learned}`, options),
      {
        credentials: 'include',
      }
    );
    return handleApiResponse<Verb[]>(response);
  }

  // Поиск глаголов по инфинитиву
  static async searchVerbs(
    query: string,
    options?: ServiceOptions
  ): Promise<Verb[]> {
    const response = await fetch(
      buildUrl(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`,
        options
      ),
      {
        credentials: 'include',
      }
    );
    return handleApiResponse<Verb[]>(response);
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
