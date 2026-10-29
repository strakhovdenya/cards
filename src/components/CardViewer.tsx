'use client';

import { UniversalCardViewer } from './UniversalCardViewer';
import { AdaptiveCardStrategy } from '@/strategies/AdaptiveCardStrategy';
import { ClientCardService } from '@/services/cardService';
import type { Card as CardType } from '@/types';

interface CardViewerProps {
  cards: CardType[];
  onCardUpdate?: (updatedCard: CardType) => void;
  isGuest?: boolean;
  onGuestToggleLearned?: (id: string, learned: boolean) => void;
}

// Гибкий просмотрщик слайдов карточек
const adaptiveCardStrategy = new AdaptiveCardStrategy();

const toggleLearned = (id: string, learned: boolean) =>
  ClientCardService.updateCardWithResult(id, { learned });

const refetchCard = (id: string) => ClientCardService.getCardById(id);

export function CardViewer({
  cards,
  onCardUpdate,
  isGuest = false,
  onGuestToggleLearned,
}: CardViewerProps) {
  return (
    <UniversalCardViewer
      cards={cards}
      strategy={adaptiveCardStrategy}
      onCardUpdate={onCardUpdate}
      toggleLearnedService={isGuest ? undefined : toggleLearned}
      refetchCard={isGuest ? undefined : refetchCard}
      isGuest={isGuest}
      onGuestToggleLearned={isGuest ? onGuestToggleLearned : undefined}
    />
  );
}
