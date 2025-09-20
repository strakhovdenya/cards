'use client';

import { UniversalCardViewer } from './UniversalCardViewer';
import { AdaptiveCardStrategy } from '@/strategies/AdaptiveCardStrategy';
import { ClientCardService } from '@/services/cardService';
import type { Card as CardType } from '@/types';

interface CardViewerProps {
  cards: CardType[];
  onCardUpdate?: (updatedCard: CardType) => void;
}

// Создаем единственный экземпляр адаптер-стратегии для оптимизации
const adaptiveCardStrategy = new AdaptiveCardStrategy();

export function CardViewer({ cards, onCardUpdate }: CardViewerProps) {
  return (
    <UniversalCardViewer
      cards={cards}
      strategy={adaptiveCardStrategy}
      onCardUpdate={onCardUpdate}
      toggleLearnedService={async (id: string, learned: boolean) => {
        await ClientCardService.toggleLearnedStatus(id, learned);
      }}
    />
  );
}
