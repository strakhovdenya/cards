import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type { ApiResponse, TimeQuestion } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthenticatedUser();

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');

    // Сначала получаем общее количество активных вопросов
    let countQuery = supabase
      .from('time_questions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (difficulty) {
      countQuery = countQuery.eq('difficulty_level', parseInt(difficulty));
    }

    const { count, error: countError } = (await countQuery) as {
      count: number | null;
      error: unknown;
    };

    if (countError || !count || count === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No time questions available' },
        { status: 404 }
      );
    }

    // Генерируем случайное смещение
    const randomOffset = Math.floor(Math.random() * count);

    // Получаем вопрос по случайному смещению
    let query = supabase
      .from('time_questions')
      .select('*')
      .eq('is_active', true);

    if (difficulty) {
      query = query.eq('difficulty_level', parseInt(difficulty));
    }

    const { data: question, error } = (await query
      .order('id')
      .range(randomOffset, randomOffset)
      .single()) as { data: TimeQuestion | null; error: unknown };

    if (error || !question) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No time questions available' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<TimeQuestion>>({
      data: question,
      message: 'Random time question fetched successfully',
    });
  } catch (error) {
    console.error('Error in GET /api/time/random:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
