'use client';

import {
  Card as MUICard,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { VolumeUp } from '@mui/icons-material';
import type { Card as CardType } from '@/types';
import { memo, useState, useEffect, useCallback } from 'react';
import { useSpeech } from '@/services/speechService';

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

const SpeechButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(4px)',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease-in-out',
  zIndex: 10,
}));

export const Card = memo(function Card({
  card,
  isFlipped,
  onFlip,
  frontSide,
}: CardProps) {
  const { speak, isSupported } = useSpeech();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Определяем что показывать на лицевой и обратной стороне
  const frontText = frontSide === 'german' ? card.germanWord : card.translation;
  const backText = frontSide === 'german' ? card.translation : card.germanWord;

  // Определяем какой текст произносить (только немецкие слова)
  const textToSpeak = card.germanWord; // Всегда произносим немецкое слово

  // Определяем когда показывать кнопку произношения
  const shouldShowSpeechButton =
    isSupported() &&
    // В режиме "de → ru": показываем на лицевой стороне (немецкое слово)
    // В режиме "ru → de": показываем на обратной стороне (немецкое слово)
    ((frontSide === 'german' && !isFlipped) ||
      (frontSide === 'russian' && isFlipped));

  const handleSpeak = useCallback(
    async (event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation(); // Предотвращаем переворот карточки
      }

      if (!isSupported()) {
        console.warn('Speech synthesis is not supported');
        return;
      }

      setIsSpeaking(true);
      try {
        await speak(textToSpeak, {
          lang: 'de-DE',
          rate: 0.8, // Немного медленнее для лучшего понимания
        });
      } catch (error) {
        console.error('Speech error:', error);
        // Можно добавить уведомление пользователю об ошибке
      } finally {
        setIsSpeaking(false);
      }
    },
    [speak, isSupported, textToSpeak]
  );

  // Обработка горячей клавиши P для произношения
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        void handleSpeak();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSpeak]);

  return (
    <FlipCard onClick={onFlip}>
      <CardInner isFlipped={isFlipped}>
        <CardFront>
          <CardText variant="h4">{frontText}</CardText>
          {/* Кнопка произношения на лицевой стороне */}
          {shouldShowSpeechButton && !isFlipped && (
            <Tooltip title="Произнести слово">
              <SpeechButton
                size="small"
                onClick={(event) => {
                  void handleSpeak(event);
                }}
                disabled={isSpeaking}
                sx={{
                  color: isSpeaking ? 'text.disabled' : 'primary.main',
                }}
              >
                <VolumeUp fontSize="small" />
              </SpeechButton>
            </Tooltip>
          )}
        </CardFront>
        <CardBack>
          <TranslationText variant="h5">{backText}</TranslationText>
          {/* Кнопка произношения на обратной стороне */}
          {shouldShowSpeechButton && isFlipped && (
            <Tooltip title="Произнести слово">
              <SpeechButton
                size="small"
                onClick={(event) => {
                  void handleSpeak(event);
                }}
                disabled={isSpeaking}
                sx={{
                  color: isSpeaking ? 'text.disabled' : 'primary.main',
                }}
              >
                <VolumeUp fontSize="small" />
              </SpeechButton>
            </Tooltip>
          )}
        </CardBack>
      </CardInner>
    </FlipCard>
  );
});
