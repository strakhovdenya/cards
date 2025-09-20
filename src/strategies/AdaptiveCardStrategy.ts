import type { Card } from '@/types';
import type { CardStrategy, CardDisplayData } from '@/types/cardStrategy';
import { BasicCardStrategy } from './BasicCardStrategy';
import { NounCardStrategy } from './NounCardStrategy';

// Создаем единственные экземпляры стратегий для оптимизации
const basicCardStrategy = new BasicCardStrategy();
const nounCardStrategy = new NounCardStrategy();

export class AdaptiveCardStrategy implements CardStrategy<Card> {
  private getStrategy(card: Card): CardStrategy<Card> {
    // Для существительных используем специальную стратегию
    if (card.word_type === 'noun') {
      return nounCardStrategy;
    }

    // Для всех остальных типов используем базовую стратегию
    return basicCardStrategy;
  }

  getDisplayData(card: Card, frontSide: 'german' | 'russian'): CardDisplayData {
    return this.getStrategy(card).getDisplayData(card, frontSide);
  }

  getSpeechText(card: Card): string {
    return this.getStrategy(card).getSpeechText(card);
  }

  getTags(
    card: Card
  ): Array<{ id: string; name: string; color: string }> | undefined {
    return this.getStrategy(card).getTags(card);
  }

  supports(card: Card): boolean {
    return this.getStrategy(card).supports(card);
  }

  getType(): string {
    return 'adaptive-card';
  }
}
