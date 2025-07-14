import { NextRequest, NextResponse } from 'next/server';
import { CardService } from '@/lib/supabase';
import { CreateCardRequest, ApiResponse, Card } from '@/types';

// GET /api/cards - получить все карточки (пока без фильтрации по user_id)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    let cards;
    if (userId) {
      // Если user_id указан, фильтруем по нему
      cards = await CardService.getCardsByUserId(userId);
    } else {
      // Пока возвращаем все карточки
      cards = await CardService.getAllCards();
    }

    return NextResponse.json<ApiResponse<Card[]>>({
      data: cards,
      message: 'Cards fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
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
    const body = (await request.json()) as CreateCardRequest;

    // Упрощенная валидация - пока только germanWord и translation обязательны
    if (!body.germanWord || !body.translation) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'germanWord and translation are required',
        },
        { status: 400 }
      );
    }

    const newCard = await CardService.createCard(body);

    return NextResponse.json<ApiResponse<Card>>(
      {
        data: newCard,
        message: 'Card created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
