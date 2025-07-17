import { createClient } from '@supabase/supabase-js';
import type {
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
} from '@/types';

// Создаем серверный клиент с Service Role Key для полного доступа к базе данных
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Интерфейс для ошибок Supabase
interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// Типы для Supabase таблиц

// Тип для таблицы cards (обновлен для новой системы тегов)
export interface DatabaseCard {
  id: string;
  german_word: string;
  translation: string;
  user_id: string;
  learned: boolean;
  created_at: string;
  updated_at: string;
}

// Новый тип для таблицы tags
export interface DatabaseTag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Тип для связующей таблицы card_tags
export interface DatabaseCardTag {
  card_id: string;
  tag_id: string;
  created_at: string;
}

// Тип для джойна карточки с тегами
export interface DatabaseCardWithTags {
  id: string;
  german_word: string;
  translation: string;
  user_id: string;
  learned: boolean;
  created_at: string;
  updated_at: string;
  tags: DatabaseTag[];
}

// Тип для ответа Supabase с JOIN'ом карточек и тегов
export interface SupabaseCardWithTags extends DatabaseCard {
  card_tags: Array<{
    tag_id: string;
    tags: DatabaseTag;
  }> | null;
}

// Утилита для безопасного получения сообщения об ошибке
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as SupabaseError).message);
  }
  return 'Unknown error occurred';
};

// Утилита для безопасного получения кода ошибки
const getErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as SupabaseError).code);
  }
  return undefined;
};

// Утилиты для конвертации тегов
export const toDatabaseTag = (
  tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DatabaseTag, 'id' | 'created_at' | 'updated_at'> => ({
  name: tag.name,
  color: tag.color,
  user_id: tag.user_id,
});

export const fromDatabaseTag = (dbTag: DatabaseTag): Tag => ({
  id: dbTag.id,
  name: dbTag.name,
  color: dbTag.color,
  user_id: dbTag.user_id,
  createdAt: new Date(dbTag.created_at),
  updatedAt: new Date(dbTag.updated_at),
});

// Обновленные утилиты для конвертации карточек
export const toDatabaseCard = (
  card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'tags'>
): Omit<DatabaseCard, 'id' | 'created_at' | 'updated_at'> => ({
  german_word: card.germanWord,
  translation: card.translation,
  user_id: card.user_id,
  learned: card.learned,
});

export const fromDatabaseCard = (
  dbCard: DatabaseCard,
  tags: Tag[] = []
): Card => ({
  id: dbCard.id,
  germanWord: dbCard.german_word,
  translation: dbCard.translation,
  user_id: dbCard.user_id,
  tags: tags,
  learned: dbCard.learned,
  createdAt: new Date(dbCard.created_at),
  updatedAt: new Date(dbCard.updated_at),
});

// Сервис для работы с карточками
export class CardService {
  private static readonly tableName = 'cards';

  // Получить все карточки (без фильтрации по пользователю)
  static async getAllCards(): Promise<Card[]> {
    const {
      data,
      error,
    }: { data: SupabaseCardWithTags[] | null; error: SupabaseError | null } =
      await supabase
        .from(this.tableName)
        .select(
          `
        *,
        card_tags (
          tag_id,
          tags (
            id,
            name,
            color,
            user_id,
            created_at,
            updated_at
          )
        )
      `
        )
        .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cards: ${getErrorMessage(error)}`);
    }

    return (data ?? []).map((dbCard) => {
      const tags =
        dbCard.card_tags?.map((ct) => fromDatabaseTag(ct.tags)) ?? [];
      return fromDatabaseCard(dbCard, tags);
    });
  }

  // Получить все карточки пользователя
  static async getCardsByUserId(userId: string): Promise<Card[]> {
    const {
      data,
      error,
    }: { data: SupabaseCardWithTags[] | null; error: SupabaseError | null } =
      await supabase
        .from(this.tableName)
        .select(
          `
        *,
        card_tags (
          tag_id,
          tags (
            id,
            name,
            color,
            user_id,
            created_at,
            updated_at
          )
        )
      `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cards: ${getErrorMessage(error)}`);
    }

    return (data ?? []).map((dbCard) => {
      const tags =
        dbCard.card_tags?.map((ct) => fromDatabaseTag(ct.tags)) ?? [];
      return fromDatabaseCard(dbCard, tags);
    });
  }

  // Создать новую карточку
  static async createCard(cardData: CreateCardRequest): Promise<Card> {
    const dbCard = toDatabaseCard({
      germanWord: cardData.germanWord,
      translation: cardData.translation,
      user_id: '00000000-0000-0000-0000-000000000000', // Заглушка для старого кода
      learned: false,
    });

    const {
      data,
      error,
    }: { data: DatabaseCard | null; error: SupabaseError | null } =
      await supabase.from(this.tableName).insert(dbCard).select().single();

    if (error) {
      throw new Error(`Failed to create card: ${getErrorMessage(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from card creation');
    }

    const newCard: DatabaseCard = data;

    // Добавляем связи с тегами, если они указаны
    const tagIds = cardData.tagIds ?? [];
    if (tagIds.length > 0) {
      const cardTagData = tagIds.map((tagId) => ({
        card_id: newCard.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from('card_tags')
        .insert(cardTagData);

      if (tagError) {
        throw new Error(
          `Failed to create card-tag relations: ${getErrorMessage(tagError)}`
        );
      }
    }

    // Возвращаем карточку с тегами
    const createdCard = await this.getCardById(newCard.id);
    if (!createdCard) {
      throw new Error('Failed to retrieve created card');
    }
    return createdCard;
  }

  // Обновить карточку
  static async updateCard(
    cardId: string,
    updates: UpdateCardRequest
  ): Promise<Card> {
    const updateData: Partial<DatabaseCard> = {};

    if (updates.germanWord !== undefined)
      updateData.german_word = updates.germanWord;
    if (updates.translation !== undefined)
      updateData.translation = updates.translation;
    if (updates.learned !== undefined) updateData.learned = updates.learned;

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update card: ${getErrorMessage(error)}`);
    }

    // Обновляем теги, если они указаны
    if (updates.tagIds !== undefined) {
      // Удаляем старые связи
      await supabase.from('card_tags').delete().eq('card_id', cardId);

      // Добавляем новые связи
      if (updates.tagIds.length > 0) {
        const cardTagData = updates.tagIds.map((tagId) => ({
          card_id: cardId,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('card_tags')
          .insert(cardTagData);

        if (tagError) {
          throw new Error(
            `Failed to update card-tag relations: ${getErrorMessage(tagError)}`
          );
        }
      }
    }

    // Возвращаем карточку с обновленными тегами
    const updatedCard = await this.getCardById(cardId);
    if (!updatedCard) {
      throw new Error('Failed to retrieve updated card');
    }
    return updatedCard;
  }

  // Удалить карточку
  static async deleteCard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', cardId);

    if (error) {
      throw new Error(`Failed to delete card: ${getErrorMessage(error)}`);
    }
  }

  // Получить карточку по ID
  static async getCardById(cardId: string): Promise<Card | null> {
    const {
      data,
      error,
    }: { data: SupabaseCardWithTags | null; error: SupabaseError | null } =
      await supabase
        .from(this.tableName)
        .select(
          `
        *,
        card_tags (
          tag_id,
          tags (
            id,
            name,
            color,
            user_id,
            created_at,
            updated_at
          )
        )
      `
        )
        .eq('id', cardId)
        .single();

    if (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'PGRST116') {
        return null; // Карточка не найдена
      }
      throw new Error(`Failed to fetch card: ${getErrorMessage(error)}`);
    }

    if (!data) {
      return null;
    }

    const tags = data.card_tags?.map((ct) => fromDatabaseTag(ct.tags)) ?? [];
    return fromDatabaseCard(data, tags);
  }

  // Получить карточки по тегам
  static async getCardsByTags(userId: string, tags: string[]): Promise<Card[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .overlaps('tags', tags)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch cards by tags: ${getErrorMessage(error)}`
      );
    }

    return (data as DatabaseCard[]).map((dbCard) => fromDatabaseCard(dbCard));
  }

  // Получить только выученные/не выученные карточки
  static async getCardsByLearnedStatus(
    userId: string,
    learned: boolean
  ): Promise<Card[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('learned', learned)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch cards by learned status: ${getErrorMessage(error)}`
      );
    }

    return (data as DatabaseCard[]).map((dbCard) => fromDatabaseCard(dbCard));
  }
}

// Сервис для работы с тегами
export class TagService {
  private static readonly tableName = 'tags';

  // Получить все теги пользователя
  static async getTagsByUserId(userId: string): Promise<Tag[]> {
    const {
      data,
      error,
    }: { data: DatabaseTag[] | null; error: SupabaseError | null } =
      await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tags: ${getErrorMessage(error)}`);
    }

    return (data ?? []).map(fromDatabaseTag);
  }

  // Создать новый тег
  static async createTag(tagData: CreateTagRequest): Promise<Tag> {
    const dbTag = toDatabaseTag({
      name: tagData.name,
      color: tagData.color ?? '#2196f3',
      user_id: '00000000-0000-0000-0000-000000000000', // Заглушка для старого кода
    });

    const {
      data,
      error,
    }: { data: DatabaseTag | null; error: SupabaseError | null } =
      await supabase.from(this.tableName).insert(dbTag).select().single();

    if (error) {
      throw new Error(`Failed to create tag: ${getErrorMessage(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from tag creation');
    }

    return fromDatabaseTag(data);
  }

  // Обновить тег
  static async updateTag(
    tagId: string,
    updates: UpdateTagRequest
  ): Promise<Tag> {
    const updateData: Partial<DatabaseTag> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;

    updateData.updated_at = new Date().toISOString();

    const {
      data,
      error,
    }: { data: DatabaseTag | null; error: SupabaseError | null } =
      await supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', tagId)
        .select()
        .single();

    if (error) {
      throw new Error(`Failed to update tag: ${getErrorMessage(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from tag update');
    }

    return fromDatabaseTag(data);
  }

  // Удалить тег
  static async deleteTag(tagId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', tagId);

    if (error) {
      throw new Error(`Failed to delete tag: ${getErrorMessage(error)}`);
    }
  }

  // Получить тег по ID
  static async getTagById(tagId: string): Promise<Tag | null> {
    const {
      data,
      error,
    }: { data: DatabaseTag | null; error: SupabaseError | null } =
      await supabase.from(this.tableName).select('*').eq('id', tagId).single();

    if (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'PGRST116') {
        return null; // Тег не найден
      }
      throw new Error(`Failed to fetch tag: ${getErrorMessage(error)}`);
    }

    if (!data) {
      return null;
    }

    return fromDatabaseTag(data);
  }
}
