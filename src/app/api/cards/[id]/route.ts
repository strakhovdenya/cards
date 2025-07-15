import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CardService } from '@/lib/supabase';
import type { UpdateCardRequest, ApiResponse, Card } from '@/types';

// GET /api/cards/[id] - получить карточку по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;

    const card = await CardService.getCardById(cardId);

    if (!card) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'Card not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Card>>({
      data: card,
      message: 'Card fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/cards/[id] - обновить карточку
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const body = (await request.json()) as UpdateCardRequest;

    // Проверяем, что есть хотя бы одно поле для обновления
    if (
      !body.germanWord &&
      !body.translation &&
      !body.tagIds &&
      body.learned === undefined
    ) {
      return NextResponse.json<ApiResponse<null>>(
        {
          error: 'At least one field must be provided for update',
        },
        { status: 400 }
      );
    }

    const updatedCard = await CardService.updateCard(cardId, body);

    return NextResponse.json<ApiResponse<Card>>({
      data: updatedCard,
      message: 'Card updated successfully',
    });
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/[id] - удалить карточку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;

    await CardService.deleteCard(cardId);

    return NextResponse.json<ApiResponse<null>>({
      message: 'Card deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
