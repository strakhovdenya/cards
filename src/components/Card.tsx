'use client';

import { Card as MUICard, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { Card as CardType } from '@/types';
import { memo } from 'react';
import { SpeechButton } from './SpeechButton';

interface CardProps {
  card: CardType;
  isFlipped: boolean;
  onFlip: () => void;
  frontSide: 'german' | 'russian'; // Новый проп для выбора лицевой стороны
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
  transition: 'transform 0.4s ease-out', // Уменьшили время анимации
  transformStyle: 'preserve-3d',
  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  willChange: 'transform', // Оптимизация для GPU
  '&:hover': {
    transform: isFlipped
      ? 'rotateY(180deg) translateY(-4px)' // Уменьшили смещение
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
  willChange: 'transform', // Оптимизация для GPU
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

export const Card = memo(function Card({
  card,
  isFlipped,
  onFlip,
  frontSide,
}: CardProps) {
  // Определяем что показывать на лицевой и обратной стороне
  const frontText = frontSide === 'german' ? card.germanWord : card.translation;
  const backText = frontSide === 'german' ? card.translation : card.germanWord;

  // Определяем когда показывать кнопку произношения
  const shouldShowSpeechButton =
    // В режиме "de → ru": показываем на лицевой стороне (немецкое слово)
    // В режиме "ru → de": показываем на обратной стороне (немецкое слово)
    (frontSide === 'german' && !isFlipped) ||
    (frontSide === 'russian' && isFlipped);

  return (
    <FlipCard onClick={onFlip}>
      <CardInner isFlipped={isFlipped}>
        <CardFront>
          <CardText variant="h4">{frontText}</CardText>
          {/* Кнопка произношения на лицевой стороне */}
          {shouldShowSpeechButton && !isFlipped && (
            <SpeechButton
              text={card.germanWord}
              tooltip="Произнести слово"
              size="small"
              enableHotkey={true}
            />
          )}
        </CardFront>
        <CardBack>
          <TranslationText variant="h5">{backText}</TranslationText>
          {/* Кнопка произношения на обратной стороне */}
          {shouldShowSpeechButton && isFlipped && (
            <SpeechButton
              text={card.germanWord}
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
