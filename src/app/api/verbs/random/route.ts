import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { getServiceSupabase } from '@/lib/supabase';
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

type VerbRows = { data: unknown[] | null; error: unknown };

// Выбирает случайный глагол из уже отфильтрованного по владельцу набора
const respondWithRandomVerb = ({ data, error }: VerbRows) => {
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

  const randomIndex = Math.floor(Math.random() * data.length);
  const verb = transformDatabaseVerb(data[randomIndex] as DatabaseVerb);
  return NextResponse.json<ApiResponse<Verb>>({
    data: verb,
    message: 'Random verb fetched successfully',
  });
};

// Гость читает только глаголы демо-аккаунта
const getGuestRandomVerb = async () => {
  const demoUserId = process.env.DEMO_USER_ID;
  if (!demoUserId) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Demo user is not configured' },
      { status: 500 }
    );
  }

  try {
    const rows = await getServiceSupabase()
      .from('verbs')
      .select('*')
      .eq('user_id', demoUserId)
      .order('created_at', { ascending: false });
    return respondWithRandomVerb(rows);
  } catch (error) {
    console.error('Error fetching guest random verb:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('guest') === '1') {
    return getGuestRandomVerb();
  }

  try {
    const { user, supabase } = await getAuthenticatedUser();

    // Получаем глаголы только текущего пользователя и выбираем случайный
    const rows = await supabase
      .from('verbs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return respondWithRandomVerb(rows);
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
