import { supabase } from '@/lib/supabase';

export interface TimeQuestion {
  id: string;
  time_value: string;
  hour: number;
  minute: number;
  formal_description: string;
  formal_words: string[];
  informal_description: string;
  informal_words: string[];
  word_pool: string[];
  difficulty_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeQuestionRequest {
  time_value: string;
  hour: number;
  minute: number;
  formal_description: string;
  formal_words: string[];
  informal_description: string;
  informal_words: string[];
  word_pool: string[];
  difficulty_level: number;
}

class TimeService {
  /**
   * Получить случайный вопрос времени
   */
  async getRandomTimeQuestion(
    difficulty?: number
  ): Promise<TimeQuestion | null> {
    try {
      // Сначала получаем общее количество активных вопросов
      let countQuery = supabase
        .from('time_questions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (difficulty) {
        countQuery = countQuery.eq('difficulty_level', difficulty);
      }

      const { count, error: countError } = await countQuery;

      if (countError || !count || count === 0) {
        console.error('Error counting time questions:', countError);
        return null;
      }

      // Генерируем случайное смещение
      const randomOffset = Math.floor(Math.random() * count);

      // Получаем вопрос по случайному смещению
      let query = supabase
        .from('time_questions')
        .select('*')
        .eq('is_active', true);

      if (difficulty) {
        query = query.eq('difficulty_level', difficulty);
      }

      const { data, error } = (await query
        .order('id')
        .range(randomOffset, randomOffset)
        .single()) as { data: TimeQuestion | null; error: unknown };

      if (error) {
        console.error('Error fetching random time question:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getRandomTimeQuestion:', error);
      return null;
    }
  }

  /**
   * Получить вопрос времени по ID
   */
  async getTimeQuestionById(id: string): Promise<TimeQuestion | null> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()) as { data: TimeQuestion | null; error: unknown };

      if (error) {
        console.error('Error fetching time question by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTimeQuestionById:', error);
      return null;
    }
  }

  /**
   * Получить вопрос времени по значению времени
   */
  async getTimeQuestionByValue(
    timeValue: string
  ): Promise<TimeQuestion | null> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .select('*')
        .eq('time_value', timeValue)
        .eq('is_active', true)
        .single()) as { data: TimeQuestion | null; error: unknown };

      if (error) {
        console.error('Error fetching time question by value:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getTimeQuestionByValue:', error);
      return null;
    }
  }

  /**
   * Получить все вопросы времени (для администраторов)
   */
  async getAllTimeQuestions(): Promise<TimeQuestion[]> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .select('*')
        .order('hour, minute')) as {
        data: TimeQuestion[] | null;
        error: unknown;
      };

      if (error) {
        console.error('Error fetching all time questions:', error);
        return [];
      }

      return data ?? [];
    } catch (error) {
      console.error('Error in getAllTimeQuestions:', error);
      return [];
    }
  }

  /**
   * Получить вопросы времени по уровню сложности
   */
  async getTimeQuestionsByDifficulty(
    difficulty: number
  ): Promise<TimeQuestion[]> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .select('*')
        .eq('difficulty_level', difficulty)
        .eq('is_active', true)
        .order('hour, minute')) as {
        data: TimeQuestion[] | null;
        error: unknown;
      };

      if (error) {
        console.error('Error fetching time questions by difficulty:', error);
        return [];
      }

      return data ?? [];
    } catch (error) {
      console.error('Error in getTimeQuestionsByDifficulty:', error);
      return [];
    }
  }

  /**
   * Создать новый вопрос времени (для администраторов)
   */
  async createTimeQuestion(
    question: TimeQuestionRequest
  ): Promise<TimeQuestion | null> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .insert(question)
        .select()
        .single()) as { data: TimeQuestion | null; error: unknown };

      if (error) {
        console.error('Error creating time question:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createTimeQuestion:', error);
      return null;
    }
  }

  /**
   * Обновить вопрос времени (для администраторов)
   */
  async updateTimeQuestion(
    id: string,
    updates: Partial<TimeQuestionRequest>
  ): Promise<TimeQuestion | null> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()) as { data: TimeQuestion | null; error: unknown };

      if (error) {
        console.error('Error updating time question:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateTimeQuestion:', error);
      return null;
    }
  }

  /**
   * Удалить вопрос времени (для администраторов)
   */
  async deleteTimeQuestion(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('time_questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting time question:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTimeQuestion:', error);
      return false;
    }
  }

  /**
   * Активировать/деактивировать вопрос времени (для администраторов)
   */
  async toggleTimeQuestionActive(
    id: string,
    isActive: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('time_questions')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        console.error('Error toggling time question active:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in toggleTimeQuestionActive:', error);
      return false;
    }
  }

  /**
   * Получить статистику вопросов времени
   */
  async getTimeQuestionsStats(): Promise<{
    total: number;
    active: number;
    byDifficulty: Record<number, number>;
  }> {
    try {
      const { data, error } = (await supabase
        .from('time_questions')
        .select('difficulty_level, is_active')) as {
        data: Array<{ difficulty_level: number; is_active: boolean }> | null;
        error: unknown;
      };

      if (error) {
        console.error('Error fetching time questions stats:', error);
        return { total: 0, active: 0, byDifficulty: {} };
      }

      const total = data?.length ?? 0;
      const active = data?.filter((q) => q.is_active).length ?? 0;
      const byDifficulty: Record<number, number> = {};

      data?.forEach((question) => {
        if (question.is_active) {
          byDifficulty[question.difficulty_level] =
            (byDifficulty[question.difficulty_level] ?? 0) + 1;
        }
      });

      return { total, active, byDifficulty };
    } catch (error) {
      console.error('Error in getTimeQuestionsStats:', error);
      return { total: 0, active: 0, byDifficulty: {} };
    }
  }
}

export const timeService = new TimeService();
