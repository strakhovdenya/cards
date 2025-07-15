'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Shuffle,
  Flip,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { ClientCardService } from '@/services/cardService';
import { Card } from './Card';
import type { Card as CardType } from '@/types';

interface CardViewerProps {
  cards: CardType[];
  onCardUpdate?: (updatedCard: CardType) => void;
}

export function CardViewer({ cards, onCardUpdate }: CardViewerProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<CardType[]>([]);
  const [frontSide, setFrontSide] = useState<'german' | 'russian'>('german');

  useEffect(() => {
    if (cards.length > 0) {
      setShuffledCards([...cards]);
    }
  }, [cards]);

  const currentCard = shuffledCards[currentCardIndex];

  // Мемоизируем теги для оптимизации
  const cardTags = useMemo(() => {
    if (!currentCard?.tags || currentCard.tags.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
        >
          {currentCard.tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              variant="outlined"
              sx={{
                borderColor: tag.color,
                color: tag.color,
                '&:hover': {
                  backgroundColor: `${tag.color}20`, // 20% прозрачность
                },
              }}
            />
          ))}
        </Stack>
      </Box>
    );
  }, [currentCard?.tags]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % shuffledCards.length);
  }, [shuffledCards.length]);

  const handlePrevious = useCallback(() => {
    setIsFlipped(false);
    setCurrentCardIndex(
      (prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length
    );
  }, [shuffledCards.length]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [shuffledCards]);

  const handleToggleLearned = useCallback(async () => {
    if (!currentCard || !onCardUpdate) return;

    // Оптимистичное обновление UI
    const optimisticCard = { ...currentCard, learned: !currentCard.learned };
    const optimisticShuffledCards = shuffledCards.map((card) =>
      card.id === currentCard.id ? optimisticCard : card
    );
    setShuffledCards(optimisticShuffledCards);
    onCardUpdate(optimisticCard);

    try {
      // Отправляем запрос в фоне
      await ClientCardService.toggleLearnedStatus(
        currentCard.id,
        !currentCard.learned
      );
    } catch (error) {
      console.error('Error toggling learned status:', error);
      // Откатываем изменения при ошибке
      setShuffledCards(shuffledCards);
      onCardUpdate(currentCard);
    }
  }, [currentCard, onCardUpdate, shuffledCards]);

  const handleChangeFrontSide = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newFrontSide: 'german' | 'russian' | null
    ) => {
      if (newFrontSide !== null) {
        setFrontSide(newFrontSide);
        setIsFlipped(false); // Сбрасываем флип при смене режима
      }
    },
    []
  );

  // Клавиатурные сокращения для быстрой навигации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Проверяем условие, но не возвращаемся рано из хука
      const canNavigate = shuffledCards.length > 1;

      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (canNavigate) {
            event.preventDefault();
            handlePrevious();
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (canNavigate) {
            event.preventDefault();
            handleNext();
          }
          break;
        case ' ':
        case 'Space':
          event.preventDefault();
          handleFlip();
          break;
        case 's':
        case 'S':
          if (canNavigate) {
            event.preventDefault();
            handleShuffle();
          }
          break;
        case 'Enter':
          event.preventDefault();
          void handleToggleLearned();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          setFrontSide((prev) => (prev === 'german' ? 'russian' : 'german'));
          setIsFlipped(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleNext,
    handlePrevious,
    handleFlip,
    handleShuffle,
    handleToggleLearned,
    shuffledCards.length,
  ]);

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

      {/* Переключатель лицевой стороны */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Tooltip title="Выберите какую сторону показывать первой">
          <ToggleButtonGroup
            value={frontSide}
            exclusive
            onChange={handleChangeFrontSide}
            size="small"
            color="primary"
          >
            <ToggleButton value="german">de → ru</ToggleButton>
            <ToggleButton value="russian">ru → de</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>

      {/* Карточка */}
      <Box sx={{ mb: 4 }}>
        <Card
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          frontSide={frontSide}
        />
      </Box>

      {/* Теги */}
      {cardTags}

      {/* Статус изучения */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant={currentCard.learned ? 'contained' : 'outlined'}
          color={currentCard.learned ? 'success' : 'primary'}
          onClick={() => void handleToggleLearned()}
          startIcon={
            currentCard.learned ? <CheckCircle /> : <RadioButtonUnchecked />
          }
        >
          {currentCard.learned ? 'Выучено' : 'Отметить как выученное'}
        </Button>
      </Box>

      {/* Подсказка */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, textAlign: 'center' }}
      >
        {isFlipped
          ? 'Нажмите для возврата'
          : `Нажмите для показа ${frontSide === 'german' ? 'русского перевода' : 'немецкого слова'}`}
        <br />
        <Typography component="span" variant="caption" color="text.disabled">
          Горячие клавиши: ← → (навигация), Пробел (перевернуть), Enter
          (выучено), S (перемешать), F (сменить режим)
        </Typography>
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
