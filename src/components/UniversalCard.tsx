'use client';

import { Card as MUICard, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { memo } from 'react';
import { SpeechButton } from './SpeechButton';
import type { FrontSide } from './navigation/FrontSideToggle';
import type {
  CardStrategy,
  CardData,
  CardDisplayData,
} from '@/types/cardStrategy';

interface UniversalCardProps<T extends CardData = CardData> {
  card: T;
  strategy: CardStrategy<T>;
  isFlipped: boolean;
  onFlip: () => void;
  frontSide: FrontSide;
}

const FlipCard = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  minWidth: 320,
  height: 200,
  margin: '0 auto',
  cursor: 'pointer',
  perspective: '1000px',
  [theme.breakpoints.down('sm')]: {
    maxWidth: '90vw',
    minWidth: 280,
    height: 180,
  },
}));

const CardInner = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isFlipped',
})<{ isFlipped: boolean }>(({ isFlipped }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  textAlign: 'center',
  transition: 'transform 0.4s ease-out',
  transformStyle: 'preserve-3d',
  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  willChange: 'transform',
  '&:hover': {
    transform: isFlipped
      ? 'rotateY(180deg) translateY(-4px)'
      : 'rotateY(0deg) translateY(-4px)',
  },
}));

const CardSide = styled(MUICard)(({ theme }) => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  willChange: 'transform',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const CardFront = styled(CardSide)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

const CardBack = styled(CardSide)(({ theme }) => ({
  backgroundColor: '#e3f2fd',
  border: `2px solid ${theme.palette.primary.light}`,
  transform: 'rotateY(180deg)',
}));

const CardText = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.8rem',
  color: theme.palette.primary.main,
  textAlign: 'center',
  lineHeight: 1.2,
  opacity: 1,
  transition: 'opacity 0.3s ease-in-out',
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

const TranslationText = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: '1.5rem',
  color: theme.palette.primary.dark,
  textAlign: 'center',
  lineHeight: 1.2,
  opacity: 1,
  transition: 'opacity 0.3s ease-in-out',
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.3rem',
  },
}));

export const UniversalCard = memo(function UniversalCard<T extends CardData>({
  card,
  strategy,
  isFlipped,
  onFlip,
  frontSide,
}: UniversalCardProps<T>) {
  // Получаем данные для отображения через стратегию
  const displayData: CardDisplayData = strategy.getDisplayData(card, frontSide);

  // Получаем текст для произношения
  const speechText = strategy.getSpeechText(card);

  // Определяем когда показывать кнопку произношения
  const shouldShowSpeechButton =
    (frontSide === 'german' && !isFlipped) ||
    (frontSide === 'russian' && isFlipped);

  return (
    <FlipCard onClick={onFlip}>
      <CardInner isFlipped={isFlipped}>
        <CardFront>
          <CardText variant="h4">{displayData.frontText}</CardText>
          {/* Кнопка произношения на лицевой стороне */}
          {shouldShowSpeechButton && !isFlipped && (
            <SpeechButton
              text={speechText}
              tooltip="Произнести слово"
              size="small"
              enableHotkey={true}
            />
          )}
        </CardFront>
        <CardBack>
          <TranslationText variant="h5">{displayData.backText}</TranslationText>
          {/* Кнопка произношения на обратной стороне */}
          {shouldShowSpeechButton && isFlipped && (
            <SpeechButton
              text={speechText}
              tooltip="Произнести слово"
              size="small"
              enableHotkey={true}
            />
          )}
        </CardBack>
      </CardInner>
    </FlipCard>
  );
});
