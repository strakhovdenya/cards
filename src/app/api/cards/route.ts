import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { isDuplicateGermanWord, extractGermanWords } from '@/utils/cardUtils';
import type {
  CreateCardRequest,
  ApiResponse,
  Card,
  DatabaseCard,
  SupabaseError,
} from '@/types';

// GET /api/cards - получить карточки текущего пользователя
export async function GET() {
  try {
    const { user, supabase } = await getAuthenticatedUser();

    // Явная фильтрация по user_id + RLS для двойной защиты
    const { data: cards, error } = await supabase
      .from('cards')
      .select(
        `
        *,
        tags:card_tags(
          tag:tags(*)
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Преобразуем данные в нужный формат (snake_case -> camelCase)
    const formattedCards: Card[] = (cards || []).map((card: DatabaseCard) => ({
      id: card.id,
      germanWord: card.german_word,
      translation: card.translation,
      user_id: card.user_id,
      learned: card.learned,
      createdAt: new Date(card.created_at),
      updatedAt: new Date(card.updated_at),
      tags:
        card.tags?.map((ct) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          color: ct.tag.color,
          user_id: ct.tag.user_id,
          createdAt: new Date(ct.tag.created_at),
          updatedAt: new Date(ct.tag.updated_at),
        })) ?? [],
    }));

    return NextResponse.json<ApiResponse<Card[]>>({
      data: formattedCards,
      message: 'Cards fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching cards:', error);

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

// POST /api/cards - создать новую карточку
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const body = (await request.json()) as CreateCardRequest;

    // Валидация
    if (!body.germanWord || !body.translation) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'germanWord and translation are required',
        },
        { status: 400 }
      );
    }

    // Проверка на дубликаты
    const { data: existingCards, error: duplicateCheckError } = await supabase
      .from('cards')
      .select('german_word')
      .eq('user_id', user.id);

    if (duplicateCheckError) {
      console.error('Error fetching existing cards:', duplicateCheckError);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Ошибка при проверке дубликатов' },
        { status: 500 }
      );
    }

    const existingGermanWords = extractGermanWords(
      (existingCards ?? []).map((card) => ({
        germanWord: card.german_word as string,
      }))
    );

    if (isDuplicateGermanWord(body.germanWord, existingGermanWords)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Карточка с таким немецким словом уже существует' },
        { status: 409 }
      );
    }

    // Создаем карточку (user_id автоматически добавляется через RLS)
    const { data: card, error } = (await supabase
      .from('cards')
      .insert([
        {
          german_word: body.germanWord,
          translation: body.translation,
        },
      ])
      .select()
      .single()) as { data: DatabaseCard | null; error: SupabaseError | null };

    if (error) {
      throw new Error(error.message);
    }

    // Добавляем теги если указаны - ИСПРАВЛЕНО: добавляем user_id для безопасности
    if (body.tagIds && body.tagIds.length > 0) {
      // Сначала проверяем что все теги принадлежат пользователю
      const { data: userTags, error: tagCheckError } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .in('id', body.tagIds);

      if (tagCheckError) {
        throw new Error(tagCheckError.message);
      }

      // Проверяем что все запрашиваемые теги принадлежат пользователю
      if (!userTags || userTags.length !== body.tagIds.length) {
        throw new Error('Some tags do not belong to the user');
      }

      // Создаем связи с явным указанием user_id (триггер тоже его проставит, но для надежности)
      const cardTagInserts = body.tagIds.map((tagId) => ({
        card_id: card!.id,
        tag_id: tagId,
        user_id: user.id, // Явно указываем user_id для безопасности
      }));

      const { error: tagError } = await supabase
        .from('card_tags')
        .insert(cardTagInserts);

      if (tagError) {
        console.error('Error adding tags to card:', tagError);
        // Не прерываем выполнение, карточка уже создана
      }
    }

    // Получаем полную карточку с тегами
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
      .eq('id', card!.id)
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
        fullCard!.tags?.map((ct) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          color: ct.tag.color,
          user_id: ct.tag.user_id,
          createdAt: new Date(ct.tag.created_at),
          updatedAt: new Date(ct.tag.updated_at),
        })) ?? [],
    };

    return NextResponse.json<ApiResponse<Card>>(
      {
        data: formattedCard,
        message: 'Card created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating card:', error);

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
