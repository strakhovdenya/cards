'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Typography, Stack, Chip } from '@mui/material';
import { ArrowBack, ArrowForward, Shuffle, Flip } from '@mui/icons-material';
import { Card } from './Card';
import { Card as CardType } from '@/types';

interface CardViewerProps {
  cards: CardType[];
}

export function CardViewer({ cards }: CardViewerProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<CardType[]>([]);

  useEffect(() => {
    if (cards.length > 0) {
      setShuffledCards([...cards]);
    }
  }, [cards]);

  const currentCard = shuffledCards[currentCardIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % shuffledCards.length);
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setCurrentCardIndex(
      (prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length
    );
  };

  const handleShuffle = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  if (!currentCard) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: 3,
        }}
      >
        <Typography variant="h5" color="text.secondary">
          Карточки не найдены
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Добавьте карточки для изучения
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 3,
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* Индикатор прогресса */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Chip
          label={`${currentCardIndex + 1} из ${shuffledCards.length}`}
          color="primary"
          variant="outlined"
          size="small"
        />
      </Box>

      {/* Карточка */}
      <Box sx={{ mb: 4 }}>
        <Card card={currentCard} isFlipped={isFlipped} onFlip={handleFlip} />
      </Box>

      {/* Подсказка */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, textAlign: 'center' }}
      >
        {isFlipped ? 'Нажмите для возврата' : 'Нажмите для перевода'}
      </Typography>

      {/* Кнопки управления */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handlePrevious}
          startIcon={<ArrowBack />}
          disabled={shuffledCards.length <= 1}
        >
          Назад
        </Button>

        <Button
          variant="contained"
          onClick={handleFlip}
          startIcon={<Flip />}
          sx={{ minWidth: 120 }}
        >
          Перевернуть
        </Button>

        <Button
          variant="outlined"
          onClick={handleNext}
          endIcon={<ArrowForward />}
          disabled={shuffledCards.length <= 1}
        >
          Вперёд
        </Button>
      </Stack>

      {/* Кнопка перемешивания */}
      <Button
        variant="outlined"
        onClick={handleShuffle}
        startIcon={<Shuffle />}
        color="secondary"
        disabled={shuffledCards.length <= 1}
      >
        Перемешать
      </Button>
    </Box>
  );
}
