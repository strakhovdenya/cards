import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import type {
  BulkCreateCardsRequest,
  ApiResponse,
  Card,
  DatabaseCard,
  SupabaseError,
} from '@/types';

// POST /api/cards/bulk - массовое создание карточек
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const body = (await request.json()) as BulkCreateCardsRequest;

    if (!body.cards || !Array.isArray(body.cards) || body.cards.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Cards array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Валидируем каждую карточку
    for (const [index, card] of body.cards.entries()) {
      if (!card.germanWord || !card.translation) {
        return NextResponse.json<ApiResponse<null>>(
          {
            error: `Card at index ${index}: germanWord and translation are required`,
          },
          { status: 400 }
        );
      }
    }

    const createdCards: Card[] = [];

    // Создаем карточки по одной (можно оптимизировать позже)
    for (const cardData of body.cards) {
      // Создаем карточку
      const { data: card, error } = (await supabase
        .from('cards')
        .insert([
          {
            german_word: cardData.germanWord,
            translation: cardData.translation,
          },
        ])
        .select()
        .single()) as {
        data: DatabaseCard | null;
        error: SupabaseError | null;
      };

      if (error) {
        console.error('Error creating card:', error);
        continue; // Пропускаем ошибочные карточки
      }

      // Добавляем теги если указаны - ИСПРАВЛЕНО: безопасные операции с user_id
      if (cardData.tagIds && cardData.tagIds.length > 0) {
        // Проверяем что все теги принадлежат пользователю
        const { data: userTags, error: tagCheckError } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', user.id)
          .in('id', cardData.tagIds);

        if (tagCheckError) {
          console.error('Error checking tags ownership:', tagCheckError);
          continue; // Пропускаем эту карточку
        }

        // Проверяем что все запрашиваемые теги принадлежат пользователю
        if (!userTags || userTags.length !== cardData.tagIds.length) {
          console.error(
            'Some tags do not belong to the user for card:',
            cardData
          );
          continue; // Пропускаем эту карточку
        }

        const cardTagInserts = cardData.tagIds.map((tagId) => ({
          card_id: card!.id,
          tag_id: tagId,
          user_id: user.id, // Явно указываем user_id для безопасности
        }));

        const { error: tagError } = await supabase
          .from('card_tags')
          .insert(cardTagInserts);

        if (tagError) {
          console.error('Error adding tags to card:', tagError);
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
        .single()) as {
        data: DatabaseCard | null;
        error: SupabaseError | null;
      };

      if (fetchError) {
        console.error('Error fetching full card:', fetchError);
        continue;
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

      createdCards.push(formattedCard);
    }

    return NextResponse.json<ApiResponse<Card[]>>(
      {
        data: createdCards,
        message: `Successfully created ${createdCards.length} out of ${body.cards.length} cards`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in bulk card creation:', error);

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
