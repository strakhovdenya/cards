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

    if (error) {
      console.error('Error fetching verbs in GET /api/verbs/random:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No verbs available for training' },
        { status: 404 }
      );
    }

    // Выбираем случайный глагол из результатов
    const randomIndex = Math.floor(Math.random() * data.length);
    const verb = transformDatabaseVerb(data[randomIndex] as DatabaseVerb);
    return NextResponse.json<ApiResponse<Verb>>({
      data: verb,
      message: 'Random verb fetched successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error in GET /api/verbs/random:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
