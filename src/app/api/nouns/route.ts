import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { supabase as serviceSupabase } from '@/lib/supabase';
import type { ApiResponse, Card, DatabaseCard } from '@/types';

// GET /api/nouns - получить только существительные для пользователя или демо
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
      const { data: cards, error } = await serviceSupabase
        .from('cards')
        .select(
          `
          *,
          tags:card_tags(
            tag:tags(*)
          )
        `
        )
        .eq('user_id', demoUserId)
        .eq('word_type', 'noun')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const formattedCards: Card[] = (cards || []).map(
        (card: DatabaseCard) => ({
          id: card.id,
          germanWord: card.german_word,
          translation: card.translation,
          user_id: card.user_id,
          learned: card.learned,
          word_type: card.word_type,
          base_form: card.base_form,
          grammar_data: card.grammar_data,
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
        })
      );

      return NextResponse.json<ApiResponse<Card[]>>({
        data: formattedCards,
        message: 'Nouns fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching guest nouns:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  try {
    const { user, supabase } = await getAuthenticatedUser();

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
      .eq('word_type', 'noun')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const formattedCards: Card[] = (cards || []).map((card: DatabaseCard) => ({
      id: card.id,
      germanWord: card.german_word,
      translation: card.translation,
      user_id: card.user_id,
      learned: card.learned,
      word_type: card.word_type,
      base_form: card.base_form,
      grammar_data: card.grammar_data,
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
      message: 'Nouns fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching nouns:', error);
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
