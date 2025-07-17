import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type {
  UpdateTagRequest,
  ApiResponse,
  Tag,
  DatabaseTag,
  SupabaseError,
} from '@/types';

// Тип для параметров динамического route
type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/tags/[id] - получить тег по ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;

    const { data: tag, error } = (await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()) as { data: DatabaseTag | null; error: SupabaseError | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Tag not found' },
          { status: 404 }
        );
      }
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

    return NextResponse.json<ApiResponse<Tag>>({
      data: formattedTag,
      message: 'Tag fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching tag:', error);

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

// PUT /api/tags/[id] - обновить тег
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;
    const body = (await request.json()) as UpdateTagRequest;

    // Валидация
    if (body.name && body.name.trim().length > 50) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Tag name must be 50 characters or less' },
        { status: 400 }
      );
    }

    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Color must be a valid hex color (e.g., #ff0000)' },
        { status: 400 }
      );
    }

    // Обновляем тег
    const updateData: Partial<Pick<DatabaseTag, 'name' | 'color'>> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.color !== undefined) updateData.color = body.color;

    const { data: tag, error } = (await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()) as { data: DatabaseTag | null; error: SupabaseError | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Tag not found' },
          { status: 404 }
        );
      }

      // Проверяем на ошибку уникальности
      if (error.message?.includes('unique_tag_name_per_user')) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        );
      }

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

    return NextResponse.json<ApiResponse<Tag>>({
      data: formattedTag,
      message: 'Tag updated successfully',
    });
  } catch (error) {
    console.error('Error updating tag:', error);

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

// DELETE /api/tags/[id] - удалить тег
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;

    // Удаляем тег (связи с карточками удалятся каскадно)
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tag:', error);

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
