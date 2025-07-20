import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    
    // Получаем параметр learned из URL
    const { searchParams } = new URL(request.url);
    const learnedParam = searchParams.get('learned');
    
    if (learnedParam === null) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Learned parameter is required' },
        { status: 400 }
      );
    }

    const learned = learnedParam === 'true';

    // Получаем глаголы только текущего пользователя по статусу изучения
    const { data, error } = await supabase
      .from('verbs')
      .select('*')
      .eq('user_id', user.id)
      .eq('learned', learned)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching verbs by learned status:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const verbs = data?.map(transformDatabaseVerb) || [];
    return NextResponse.json<ApiResponse<Verb[]>>({
      data: verbs,
      message: 'Verbs fetched successfully',
    });
  } catch (error) {
    console.error('Error in GET /api/verbs/by-learned-status:', error);

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