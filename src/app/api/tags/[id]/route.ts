import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { TagService } from '@/lib/supabase';
import type { UpdateTagRequest, ApiResponse, Tag } from '@/types';

// GET /api/tags/[id] - получить тег по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tagId = params.id;

    const tag = await TagService.getTagById(tagId);

    if (!tag) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Tag not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Tag>>({
      data: tag,
      message: 'Tag fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/tags/[id] - обновить тег
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tagId = params.id;
    const body = (await request.json()) as UpdateTagRequest;

    // Валидация
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json<ApiResponse<null>>(
          {
            error: 'Tag name cannot be empty',
          },
          { status: 400 }
        );
      }

      if (body.name.trim().length > 50) {
        return NextResponse.json<ApiResponse<null>>(
          {
            error: 'Tag name must be 50 characters or less',
          },
          { status: 400 }
        );
      }
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

    const updatedTag = await TagService.updateTag(tagId, body);

    return NextResponse.json<ApiResponse<Tag>>({
      data: updatedTag,
      message: 'Tag updated successfully',
    });
  } catch (error) {
    console.error('Error updating tag:', error);

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

// DELETE /api/tags/[id] - удалить тег
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tagId = params.id;

    // Сначала проверяем существует ли тег
    const existingTag = await TagService.getTagById(tagId);
    if (!existingTag) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Tag not found',
        },
        { status: 404 }
      );
    }

    await TagService.deleteTag(tagId);

    return NextResponse.json<ApiResponse<null>>({
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
