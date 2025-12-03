import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabase as serviceSupabase } from '@/lib/supabase';
import type {
  CreateTagRequest,
  ApiResponse,
  Tag,
  DatabaseTag,
  SupabaseError,
} from '@/types';

// GET /api/tags - получить теги текущего пользователя или демо
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
      const { data: tags, error } = await serviceSupabase
        .from('tags')
        .select('*')
        .eq('user_id', demoUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json<ApiResponse<Tag[]>>({
        data: tags || [],
        message: 'Tags fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching guest tags:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  try {
    const { user, supabase } = await getAuthenticatedUser();

    // Явная фильтрация по user_id + RLS для двойной защиты
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json<ApiResponse<Tag[]>>({
      data: tags || [],
      message: 'Tags fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching tags:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST /api/tags - создать новый тег
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const body = (await request.json()) as CreateTagRequest;

    // Валидация
    if (!body.name?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Tag name is required',
        },
        { status: 400 }
      );
    }

    // Ограничиваем длину имени тега
    if (body.name.trim().length > 50) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Tag name must be 50 characters or less',
        },
        { status: 400 }
      );
    }

    // Проверяем цвет (hex)
    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Color must be a valid hex color (e.g., #ff0000)',
        },
        { status: 400 }
      );
    }

    // Создаем тег (user_id добавится через RLS)
    const { data: tag, error } = (await supabase
      .from('tags')
      .insert([
        {
          name: body.name.trim(),
          color: body.color ?? '#2196f3',
        },
      ])
      .select()
      .single()) as { data: DatabaseTag | null; error: SupabaseError | null };

    if (error) {
      throw new Error(error.message);
    }

    const formattedTag: Tag = {
      id: tag!.id,
      name: tag!.name,
      color: tag!.color,
      user_id: tag!.user_id,
      createdAt: new Date(tag!.created_at),
      updatedAt: new Date(tag!.updated_at),
    };

    return NextResponse.json<ApiResponse<Tag>>(
      {
        data: formattedTag,
        message: 'Tag created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tag:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('unique_tag_name_per_user')
    ) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Tag with this name already exists',
        },
        { status: 409 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
