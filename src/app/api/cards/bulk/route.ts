import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CardService } from '@/lib/supabase';
import type { BulkCreateCardsRequest, ApiResponse, Card } from '@/types';

// POST /api/cards/bulk - массовое создание карточек
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkCreateCardsRequest;

    // Валидация запроса
    if (!body.cards || !Array.isArray(body.cards) || body.cards.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'cards array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Валидация каждой карточки
    for (let i = 0; i < body.cards.length; i++) {
      const card = body.cards[i];
      if (!card.germanWord || !card.translation) {
        return NextResponse.json<ApiResponse<null>>(
          {
            error: `Card at index ${i}: germanWord and translation are required`,
          },
          { status: 400 }
        );
      }
    }

    // Лимит на количество карточек за раз (для предотвращения злоупотреблений)
    const MAX_BULK_SIZE = 100;
    if (body.cards.length > MAX_BULK_SIZE) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: `Cannot create more than ${MAX_BULK_SIZE} cards at once`,
        },
        { status: 400 }
      );
    }

    // Создаем карточки последовательно (можно оптимизировать через batch insert)
    const createdCards: Card[] = [];
    const errors: string[] = [];

    for (let i = 0; i < body.cards.length; i++) {
      try {
        const card = await CardService.createCard(body.cards[i]);
        createdCards.push(card);
      } catch (error) {
        console.error(`Error creating card at index ${i}:`, error);
        errors.push(
          `Card ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Если есть ошибки, но созданы некоторые карточки
    if (errors.length > 0 && createdCards.length > 0) {
      return NextResponse.json<ApiResponse<Card[]>>(
        {
          data: createdCards,
          error: `Partially successful. Errors: ${errors.join('; ')}`,
          message: `Created ${createdCards.length} of ${body.cards.length} cards`,
        },
        { status: 207 } // Multi-Status
      );
    }

    // Если все карточки созданы успешно
    if (errors.length === 0) {
      return NextResponse.json<ApiResponse<Card[]>>({
        data: createdCards,
        message: `Successfully created ${createdCards.length} cards`,
      });
    }

    // Если все карточки не удалось создать
    return NextResponse.json<ApiResponse<null>>(
      {
        error: `Failed to create cards. Errors: ${errors.join('; ')}`,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error in bulk card creation:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
