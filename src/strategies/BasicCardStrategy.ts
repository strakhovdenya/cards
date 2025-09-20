import type { Card as CardType } from '@/types';
import type {
  CardStrategy,
  CardData,
  CardDisplayData,
} from '@/types/cardStrategy';

export class BasicCardStrategy implements CardStrategy<CardType> {
  getDisplayData(
    card: CardType,
    frontSide: 'german' | 'russian'
  ): CardDisplayData {
    const frontText =
      frontSide === 'german' ? card.germanWord : card.translation;
    const backText =
      frontSide === 'german' ? card.translation : card.germanWord;

    return {
      frontText,
      backText,
      speechText: card.germanWord,
      tags: card.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
      additionalInfo: {
        originalCard: card,
      },
    };
  }

  getSpeechText(card: CardType): string {
    return card.germanWord;
  }

  getTags(
    card: CardType
  ): Array<{ id: string; name: string; color: string }> | undefined {
    return card.tags?.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    }));
  }

  supports(card: CardData): boolean {
    // Проверяем, что это карточка с полями germanWord и translation
    return 'germanWord' in card && 'translation' in card;
  }

  getType(): string {
    return 'basic-card';
  }
}
