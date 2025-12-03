import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabase as serviceSupabase } from '@/lib/supabase';
import { isDuplicateGermanWord, extractGermanWords } from '@/utils/verbUtils';
import type {
  CreateVerbRequest,
  DatabaseVerb,
  ApiResponse,
  Verb,
} from '@/types';

// Хелпер для преобразования БД-модели в клиентскую
const transformDatabaseVerb = (dbVerb: DatabaseVerb) => ({
  id: dbVerb.id,
  infinitive: dbVerb.infinitive,
  translation: dbVerb.translation,
  conjugations: dbVerb.conjugations,
  examples: dbVerb.examples,
  user_id: dbVerb.user_id,
  learned: dbVerb.learned,
  createdAt: new Date(dbVerb.created_at),
  updatedAt: new Date(dbVerb.updated_at),
});

export async function GET(request: NextRequest) {
  const isGuest = request.nextUrl.searchParams.get('guest') === '1';
  const demoUserId = process.env.DEMO_USER_ID;

  if (isGuest) {
    if (!demoUserId) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Demo user is not configured' },
        { status: 500 }
      );
    }

    try {
      const { data, error } = await serviceSupabase
        .from('verbs')
        .select('*')
        .eq('user_id', demoUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const verbs =
        data?.map((verb) => transformDatabaseVerb(verb as DatabaseVerb)) || [];
      return NextResponse.json<ApiResponse<Verb[]>>({
        data: verbs,
        message: 'Verbs fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching guest verbs:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  try {
    // Берём авторизованного пользователя и клиент с RLS
    const { user, supabase } = await getAuthenticatedUser();

    // Все глаголы пользователя
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
    // Авторизация
    const { user, supabase } = await getAuthenticatedUser();

    const body = (await request.json()) as CreateVerbRequest;

    // Валидация
    if (!body.infinitive || !body.translation || !body.conjugations) {
      return NextResponse.json(
        { error: 'Инфинитив, перевод и спряжения обязательны' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.conjugations) || body.conjugations.length === 0) {
      return NextResponse.json(
        { error: 'Нужен хотя бы один элемент в conjugations' },
        { status: 400 }
      );
    }

    // Проверка на дубли
    const { data: existingVerbs, error: fetchError } = await supabase
      .from('verbs')
      .select('infinitive')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching existing verbs:', fetchError);
      return NextResponse.json(
        { error: 'Ошибка при проверке дублей' },
        { status: 500 }
      );
    }

    const existingGermanWords = extractGermanWords(existingVerbs || []);

    if (isDuplicateGermanWord(body.infinitive, existingGermanWords)) {
      return NextResponse.json(
        { error: 'Такой глагол уже есть' },
        { status: 409 }
      );
    }

    // Создание глагола (user_id проставится через RLS)
    const { data, error } = (await supabase
      .from('verbs')
      .insert({
        infinitive: body.infinitive,
        translation: body.translation,
        conjugations: body.conjugations,
        examples: body.examples ?? null,
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
