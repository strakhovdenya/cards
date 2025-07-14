import { createClient } from '@supabase/supabase-js';
import { Card, CreateCardRequest, UpdateCardRequest } from '@/types';

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

// Типы для Supabase таблицы
export interface DatabaseCard {
  id: string;
  german_word: string;
  translation: string;
  user_id: string;
  tags: string[];
  learned: boolean;
  created_at: string;
  updated_at: string;
}

// Утилиты для конвертации между типами приложения и базы данных
export const toDatabaseCard = (
  card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DatabaseCard, 'id' | 'created_at' | 'updated_at'> => ({
  german_word: card.germanWord,
  translation: card.translation,
  user_id: card.user_id,
  tags: card.tags,
  learned: card.learned,
});

export const fromDatabaseCard = (dbCard: DatabaseCard): Card => ({
  id: dbCard.id,
  germanWord: dbCard.german_word,
  translation: dbCard.translation,
  user_id: dbCard.user_id,
  tags: dbCard.tags,
  learned: dbCard.learned,
  createdAt: new Date(dbCard.created_at),
  updatedAt: new Date(dbCard.updated_at),
});

// Сервис для работы с карточками
export class CardService {
  private static tableName = 'cards';

  // Получить все карточки (без фильтрации по пользователю)
  static async getAllCards(): Promise<Card[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cards: ${error.message}`);
    }

    return data.map(fromDatabaseCard);
  }

  // Получить все карточки пользователя
  static async getCardsByUserId(userId: string): Promise<Card[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cards: ${error.message}`);
    }

    return data.map(fromDatabaseCard);
  }

  // Создать новую карточку
  static async createCard(cardData: CreateCardRequest): Promise<Card> {
    const dbCard = toDatabaseCard({
      germanWord: cardData.germanWord,
      translation: cardData.translation,
      user_id: cardData.user_id || '00000000-0000-0000-0000-000000000000', // Временный default user_id
      tags: cardData.tags || [],
      learned: false,
    });

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(dbCard)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create card: ${error.message}`);
    }

    return fromDatabaseCard(data);
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
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.learned !== undefined) updateData.learned = updates.learned;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update card: ${error.message}`);
    }

    return fromDatabaseCard(data);
  }

  // Удалить карточку
  static async deleteCard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', cardId);

    if (error) {
      throw new Error(`Failed to delete card: ${error.message}`);
    }
  }

  // Получить карточку по ID
  static async getCardById(cardId: string): Promise<Card | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', cardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Карточка не найдена
      }
      throw new Error(`Failed to fetch card: ${error.message}`);
    }

    return fromDatabaseCard(data);
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
      throw new Error(`Failed to fetch cards by tags: ${error.message}`);
    }

    return data.map(fromDatabaseCard);
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
        `Failed to fetch cards by learned status: ${error.message}`
      );
    }

    return data.map(fromDatabaseCard);
  }
}
