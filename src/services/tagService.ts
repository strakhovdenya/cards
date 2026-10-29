import type { Tag, CreateTagRequest, UpdateTagRequest } from '@/types';
import { apiRequest } from '@/services/apiResponse';

interface ServiceOptions {
  guest?: boolean;
}

// Базовый URL для API тегов
const API_BASE_URL = '/api/tags';

const buildUrl = (path: string, options?: ServiceOptions) => {
  if (!options?.guest) return path;
  return `${path}${path.includes('?') ? '&' : '?'}guest=1`;
};

// Кеш для тегов
let tagsCache: Tag[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

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
  static async getTags(
    forceRefresh = false,
    options?: ServiceOptions
  ): Promise<Tag[]> {
    const canCache = !options?.guest;

    // Если кеш актуален и не требуется принудительное обновление
    if (canCache && !forceRefresh && isCacheValid()) {
      console.log('Using cached tags:', tagsCache!.length);
      return tagsCache!;
    }

    console.log('Fetching tags from API...');
    // Загружаем теги из API
    const tags = await apiRequest<Tag[]>(buildUrl(API_BASE_URL, options), {
      credentials: 'include', // Важно для передачи cookies с сессией
    });

    if (canCache) {
      // Обновляем кеш
      tagsCache = tags;
      cacheTimestamp = Date.now();
      console.log('Updated cache with', tags.length, 'tags');
    }

    return tags;
  }

  // Создать новый тег
  static async createTag(name: string, color?: string): Promise<Tag> {
    const tagData: CreateTagRequest = {
      name,
      color,
    };

    const newTag = await apiRequest<Tag>(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Важно для передачи cookies с сессией
      body: JSON.stringify(tagData),
    });

    console.log('Created new tag:', newTag.name);
    // Инвалидируем кеш после создания тега
    invalidateCache();

    return newTag;
  }

  // Получить тег по ID
  static async getTagById(tagId: string): Promise<Tag> {
    return apiRequest<Tag>(`${API_BASE_URL}/${tagId}`, {
      credentials: 'include',
    });
  }

  // Обновить тег
  static async updateTag(
    tagId: string,
    updates: UpdateTagRequest
  ): Promise<Tag> {
    const updatedTag = await apiRequest<Tag>(`${API_BASE_URL}/${tagId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    console.log('Updated tag:', updatedTag.name);
    // Инвалидируем кеш после обновления тега
    invalidateCache();

    return updatedTag;
  }

  // Удалить тег
  static async deleteTag(tagId: string): Promise<void> {
    await apiRequest<null>(`${API_BASE_URL}/${tagId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

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
