import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type {
  UpdateVerbRequest,
  DatabaseVerb,
  ApiResponse,
  Verb,
} from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Преобразование данных из базы в клиентский формат
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;

    // Получаем глагол только если он принадлежит текущему пользователю
    const { data, error } = (await supabase
      .from('verbs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()) as { data: DatabaseVerb | null; error: unknown };

    if (error || !data) {
      return NextResponse.json({ error: 'Глагол не найден' }, { status: 404 });
    }

    const verb = transformDatabaseVerb(data);
    return NextResponse.json<ApiResponse<Verb>>({
      data: verb,
      message: 'Verb fetched successfully',
    });
  } catch (error) {
    console.error('Error in GET /api/verbs/[id]:', error);

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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;
    const body = (await request.json()) as UpdateVerbRequest;

    // Валидация данных
    if (body.infinitive !== undefined && !body.infinitive.trim()) {
      return NextResponse.json(
        { error: 'Инфинитив не может быть пустым' },
        { status: 400 }
      );
    }

    if (body.translation !== undefined && !body.translation.trim()) {
      return NextResponse.json(
        { error: 'Перевод не может быть пустым' },
        { status: 400 }
      );
    }

    // Обновляем глагол только если он принадлежит текущему пользователю
    const { data, error } = (await supabase
      .from('verbs')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()) as { data: DatabaseVerb | null; error: unknown };

    if (error || !data) {
      return NextResponse.json(
        { error: 'Глагол не найден или нет прав для обновления' },
        { status: 404 }
      );
    }

    const verb = transformDatabaseVerb(data);
    return NextResponse.json<ApiResponse<Verb>>({
      data: verb,
      message: 'Verb updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT /api/verbs/[id]:', error);

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;

    // Удаляем глагол только если он принадлежит текущему пользователю
    const { error } = await supabase
      .from('verbs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting verb:', error);
      return NextResponse.json(
        { error: 'Ошибка при удалении глагола' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Verb deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/verbs/[id]:', error);

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
