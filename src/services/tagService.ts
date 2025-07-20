import type {
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  ApiResponse,
} from '@/types';

// Базовый URL для API тегов
const API_BASE_URL = '/api/tags';

// Кеш для тегов
let tagsCache: Tag[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

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

// Функция для проверки актуальности кеша
function isCacheValid(): boolean {
  return tagsCache !== null && Date.now() - cacheTimestamp < CACHE_DURATION;
}

// Функция для инвалидации кеша
function invalidateCache(): void {
  console.log('Invalidating tags cache');
  tagsCache = null;
  cacheTimestamp = 0;
}

// Клиентский сервис для работы с тегами
export class ClientTagService {
  // Получить теги текущего пользователя (с кешированием)
  static async getTags(forceRefresh = false): Promise<Tag[]> {
    // Если кеш актуален и не требуется принудительное обновление
    if (!forceRefresh && isCacheValid()) {
      console.log('Using cached tags:', tagsCache!.length);
      return tagsCache!;
    }

    console.log('Fetching tags from API...');
    // Загружаем теги из API
    const response = await fetch(API_BASE_URL, {
      credentials: 'include', // Важно для передачи cookies с сессией
    });
    const tags = await handleApiResponse<Tag[]>(response);

    // Обновляем кеш
    tagsCache = tags;
    cacheTimestamp = Date.now();
    console.log('Updated cache with', tags.length, 'tags');

    return tags;
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
    const newTag = await handleApiResponse<Tag>(response);

    console.log('Created new tag:', newTag.name);
    // Инвалидируем кеш после создания тега
    invalidateCache();

    return newTag;
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
    const updatedTag = await handleApiResponse<Tag>(response);

    console.log('Updated tag:', updatedTag.name);
    // Инвалидируем кеш после обновления тега
    invalidateCache();

    return updatedTag;
  }

  // Удалить тег
  static async deleteTag(tagId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${tagId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await handleApiResponse<null>(response);

    console.log('Deleted tag with ID:', tagId);
    // Инвалидируем кеш после удаления тега
    invalidateCache();
  }

  // Принудительно обновить кеш тегов
  static async refreshTags(): Promise<Tag[]> {
    console.log('Force refreshing tags cache');
    return this.getTags(true);
  }

  // Очистить кеш тегов
  static clearCache(): void {
    console.log('Clearing tags cache');
    invalidateCache();
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
