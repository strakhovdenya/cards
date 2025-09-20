import type { Card } from '@/types';
import type { CardStrategy, CardDisplayData } from '@/types/cardStrategy';

export class NounCardStrategy implements CardStrategy<Card> {
  getDisplayData(card: Card, frontSide: 'german' | 'russian'): CardDisplayData {
    const frontText =
      frontSide === 'german' ? card.germanWord : card.translation;
    const backText =
      frontSide === 'german' ? card.translation : card.germanWord;

    // Для существительных показываем дополнительную грамматическую информацию
    const additionalInfo: Record<string, unknown> = {
      originalCard: card,
    };

    if (card.grammar_data) {
      const grammarData = card.grammar_data as {
        article?: string;
        plural?: string;
      };
      const article = grammarData?.article;
      const plural = grammarData?.plural;

      if (article || plural) {
        additionalInfo.grammarInfo = {
          article,
          plural,
        };
      }
    }

    return {
      frontText,
      backText,
      speechText: card.germanWord,
      tags: card.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
      additionalInfo,
    };
  }

  getSpeechText(card: Card): string {
    return card.germanWord;
  }

  getTags(
    card: Card
  ): Array<{ id: string; name: string; color: string }> | undefined {
    return card.tags?.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    }));
  }

  supports(card: Card): boolean {
    return card.word_type === 'noun';
  }

  getType(): string {
    return 'noun-card';
  }
}
