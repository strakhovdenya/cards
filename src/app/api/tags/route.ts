import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { TagService } from '@/lib/supabase';
import type { CreateTagRequest, ApiResponse, Tag } from '@/types';

// GET /api/tags - получить все теги пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId =
      searchParams.get('user_id') ?? '00000000-0000-0000-0000-000000000000';

    const tags = await TagService.getTagsByUserId(userId);

    return NextResponse.json<ApiResponse<Tag[]>>({
      data: tags,
      message: 'Tags fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
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

    // Проверяем длину имени тега
    if (body.name.trim().length > 50) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Tag name must be 50 characters or less',
        },
        { status: 400 }
      );
    }

    // Проверяем формат цвета (hex)
    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Color must be a valid hex color (e.g., #ff0000)',
        },
        { status: 400 }
      );
    }

    const newTag = await TagService.createTag(body);

    return NextResponse.json<ApiResponse<Tag>>(
      {
        data: newTag,
        message: 'Tag created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tag:', error);

    // Проверяем на ошибку уникальности
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
