import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type { DatabaseVerb, ApiResponse, Verb } from '@/types';

// Преобразование данных из базы в клиентский формат
const transformDatabaseVerb = (dbVerb: DatabaseVerb) => ({
  id: dbVerb.id,
  infinitive: dbVerb.infinitive,
  translation: dbVerb.translation,
  conjugations: dbVerb.conjugations,
  user_id: dbVerb.user_id,
  learned: dbVerb.learned,
  createdAt: new Date(dbVerb.created_at),
  updatedAt: new Date(dbVerb.updated_at),
});

export async function GET() {
  try {
    const { user, supabase } = await getAuthenticatedUser();

    // Получаем глаголы только текущего пользователя и выбираем случайный
    const { data, error } = await supabase
      .from('verbs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Выбираем случайный глагол из результатов
    let randomVerb: DatabaseVerb | null = null;
    if (data && data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      randomVerb = data[randomIndex] as DatabaseVerb;
    }

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No verbs available for training' },
        { status: 404 }
      );
    }

    if (!randomVerb) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to select random verb' },
        { status: 500 }
      );
    }

    const verb = transformDatabaseVerb(randomVerb);
    return NextResponse.json<ApiResponse<Verb>>({
      data: verb,
      message: 'Random verb fetched successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return NextResponse.json<ApiResponse<null>>(
        { error: 'Error: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
