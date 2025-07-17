import type {
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  ApiResponse,
} from '@/types';

// Базовый URL для API тегов
const API_BASE_URL = '/api/tags';

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

// Клиентский сервис для работы с тегами
export class ClientTagService {
  // Получить теги текущего пользователя
  static async getTags(): Promise<Tag[]> {
    const response = await fetch(API_BASE_URL, {
      credentials: 'include', // Важно для передачи cookies с сессией
    });
    return handleApiResponse<Tag[]>(response);
  }

  // Создать новый тег
  static async createTag(name: string, color?: string): Promise<Tag> {
    const tagData: CreateTagRequest = {
      name,
      color,
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Важно для передачи cookies с сессией
      body: JSON.stringify(tagData),
    });
    return handleApiResponse<Tag>(response);
  }

  // Получить тег по ID
  static async getTagById(tagId: string): Promise<Tag> {
    const response = await fetch(`${API_BASE_URL}/${tagId}`, {
      credentials: 'include',
    });
    return handleApiResponse<Tag>(response);
  }

  // Обновить тег
  static async updateTag(
    tagId: string,
    updates: UpdateTagRequest
  ): Promise<Tag> {
    const response = await fetch(`${API_BASE_URL}/${tagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return handleApiResponse<Tag>(response);
  }

  // Удалить тег
  static async deleteTag(tagId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${tagId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await handleApiResponse<null>(response);
  }

  // Получить статистику тегов
  static async getTagStats(): Promise<{
    total: number;
    used: number;
    unused: number;
  }> {
    const tags = await this.getTags();
    // TODO: Добавить логику подсчета использованных тегов
    // когда будут готовы API для карточек с тегами

    return {
      total: tags.length,
      used: 0, // Пока заглушка
      unused: tags.length, // Пока заглушка
    };
  }
}
