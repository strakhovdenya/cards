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
    
    // Получаем параметр поиска из URL
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Search query parameter q is required' },
        { status: 400 }
      );
    }

    // Ищем глаголы только текущего пользователя
    const { data, error } = await supabase
      .from('verbs')
      .select('*')
      .eq('user_id', user.id)
      .ilike('infinitive', `%${query}%`)
      .order('infinitive');

    if (error) {
      console.error('Error searching verbs:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const verbs = data?.map(transformDatabaseVerb) || [];
    return NextResponse.json<ApiResponse<Verb[]>>({
      data: verbs,
      message: 'Verbs searched successfully',
    });
  } catch (error) {
    console.error('Error in GET /api/verbs/search:', error);

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