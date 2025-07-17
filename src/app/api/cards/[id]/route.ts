import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type {
  UpdateCardRequest,
  ApiResponse,
  Card,
  DatabaseCard,
  DatabaseTag,
  SupabaseError,
} from '@/types';

// GET /api/cards/[id] - получить карточку по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = params;

    const { data: card, error } = (await supabase
      .from('cards')
      .select(
        `
        *,
        tags:card_tags(
          tag:tags(*)
        )
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single()) as { data: DatabaseCard | null; error: SupabaseError | null };

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Card not found' },
          { status: 404 }
        );
      }
      throw new Error(error.message);
    }

    // Форматируем результат (snake_case -> camelCase)
    const formattedCard: Card = {
      id: card!.id,
      germanWord: card!.german_word,
      translation: card!.translation,
      user_id: card!.user_id,
      learned: card!.learned,
      createdAt: new Date(card!.created_at),
      updatedAt: new Date(card!.updated_at),
      tags:
        card!.tags?.map((ct) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          color: ct.tag.color,
          user_id: ct.tag.user_id,
          createdAt: new Date(ct.tag.created_at),
          updatedAt: new Date(ct.tag.updated_at),
        })) ?? [],
    };

    return NextResponse.json<ApiResponse<Card>>({
      data: formattedCard,
      message: 'Card fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching card:', error);

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

// PUT /api/cards/[id] - обновить карточку
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = params;
    const body = (await request.json()) as UpdateCardRequest;

    // Обновляем основные данные карточки
    const updateData: Partial<
      Pick<DatabaseCard, 'german_word' | 'translation' | 'learned'>
    > = {};
    if (body.germanWord !== undefined) updateData.german_word = body.germanWord;
    if (body.translation !== undefined)
      updateData.translation = body.translation;
    if (body.learned !== undefined) updateData.learned = body.learned;

    const { error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Card not found' },
          { status: 404 }
        );
      }
      throw new Error(error.message);
    }

    // Обновляем теги если указаны
    if (body.tagIds !== undefined) {
      // Удаляем старые связи
      await supabase.from('card_tags').delete().eq('card_id', id);

      // Добавляем новые связи
      if (body.tagIds.length > 0) {
        const cardTagInserts = body.tagIds.map((tagId) => ({
          card_id: id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('card_tags')
          .insert(cardTagInserts);

        if (tagError) {
          console.error('Error updating card tags:', tagError);
        }
      }
    }

    // Получаем обновленную карточку с тегами
    const { data: fullCard, error: fetchError } = (await supabase
      .from('cards')
      .select(
        `
        *,
        tags:card_tags(
          tag:tags(*)
        )
      `
      )
      .eq('id', id)
      .single()) as { data: DatabaseCard | null; error: SupabaseError | null };

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Форматируем результат (snake_case -> camelCase)
    const formattedCard: Card = {
      id: fullCard!.id,
      germanWord: fullCard!.german_word,
      translation: fullCard!.translation,
      user_id: fullCard!.user_id,
      learned: fullCard!.learned,
      createdAt: new Date(fullCard!.created_at),
      updatedAt: new Date(fullCard!.updated_at),
      tags:
        fullCard!.tags?.map((ct: { tag: DatabaseTag }) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          color: ct.tag.color,
          user_id: ct.tag.user_id,
          createdAt: new Date(ct.tag.created_at),
          updatedAt: new Date(ct.tag.updated_at),
        })) ?? [],
    };

    return NextResponse.json<ApiResponse<Card>>({
      data: formattedCard,
      message: 'Card updated successfully',
    });
  } catch (error) {
    console.error('Error updating card:', error);

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

// DELETE /api/cards/[id] - удалить карточку
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = params;

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Card deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting card:', error);

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
