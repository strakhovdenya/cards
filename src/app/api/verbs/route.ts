import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type {
  CreateVerbRequest,
  DatabaseVerb,
  ApiResponse,
  Verb,
} from '@/types';

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
    // Получаем аутентифицированного пользователя и Supabase клиент
    const { user, supabase } = await getAuthenticatedUser();

    // Получаем глаголы только текущего пользователя
    const { data, error } = await supabase
      .from('verbs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching verbs:', error);
      return NextResponse.json(
        { error: 'Ошибка при получении глаголов' },
        { status: 500 }
      );
    }

    const verbs =
      data?.map((verb) => transformDatabaseVerb(verb as DatabaseVerb)) || [];
    return NextResponse.json<ApiResponse<Verb[]>>({
      data: verbs,
      message: 'Verbs fetched successfully',
    });
  } catch (error) {
    console.error('Error in GET /api/verbs:', error);

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

export async function POST(request: NextRequest) {
  try {
    // Получаем аутентифицированного пользователя и Supabase клиент
    const { user, supabase } = await getAuthenticatedUser();

    const body = (await request.json()) as CreateVerbRequest;

    // Валидация данных
    if (!body.infinitive || !body.translation || !body.conjugations) {
      return NextResponse.json(
        { error: 'Необходимо указать инфинитив, перевод и спряжения' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.conjugations) || body.conjugations.length === 0) {
      return NextResponse.json(
        { error: 'Необходимо указать спряжения глагола' },
        { status: 400 }
      );
    }

    // Создаем глагол с user_id текущего пользователя
    const { data, error } = (await supabase
      .from('verbs')
      .insert({
        infinitive: body.infinitive,
        translation: body.translation,
        conjugations: body.conjugations,
        user_id: user.id,
      })
      .select()
      .single()) as { data: DatabaseVerb | null; error: unknown };

    if (error) {
      console.error('Error creating verb:', error);
      return NextResponse.json(
        { error: 'Ошибка при создании глагола' },
        { status: 500 }
      );
    }

    const verb = transformDatabaseVerb(data as DatabaseVerb);
    return NextResponse.json<ApiResponse<Verb>>(
      {
        data: verb,
        message: 'Verb created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/verbs:', error);

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
