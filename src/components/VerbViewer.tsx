'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Shuffle,
  Flip,
  KeyboardHide,
  Keyboard,
  Add,
} from '@mui/icons-material';
import { VerbCard } from './VerbCard';
import type { Verb } from '@/types';

interface VerbViewerProps {
  verbs: Verb[];
  onVerbUpdate?: (updatedVerb: Verb) => void;
  onVerbDelete?: (id: string) => void;
  onAddVerb?: () => void;
  onEditVerb?: (verb: Verb) => void;
}

export function VerbViewer({ 
  verbs, 
  onVerbUpdate, 
  onVerbDelete, 
  onAddVerb, 
  onEditVerb 
}: VerbViewerProps) {
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [shuffledVerbs, setShuffledVerbs] = useState<Verb[]>([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (verbs.length > 0) {
      setShuffledVerbs([...verbs]);
      setCurrentVerbIndex(0);
    } else {
      setShuffledVerbs([]);
      setCurrentVerbIndex(0);
    }
  }, [verbs]);

  // Проверяем, что currentVerbIndex не выходит за границы
  useEffect(() => {
    if (shuffledVerbs.length > 0 && currentVerbIndex >= shuffledVerbs.length) {
      setCurrentVerbIndex(0);
    }
  }, [shuffledVerbs.length, currentVerbIndex]);

  const currentVerb = shuffledVerbs[currentVerbIndex];

  const handleNext = useCallback(() => {
    setCurrentVerbIndex((prev) => (prev + 1) % shuffledVerbs.length);
    setIsCardFlipped(false); // Сбрасываем переворот при смене карточки
  }, [shuffledVerbs.length]);

  const handlePrevious = useCallback(() => {
    setCurrentVerbIndex(
      (prev) => (prev - 1 + shuffledVerbs.length) % shuffledVerbs.length
    );
    setIsCardFlipped(false); // Сбрасываем переворот при смене карточки
  }, [shuffledVerbs.length]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...shuffledVerbs].sort(() => Math.random() - 0.5);
    setShuffledVerbs(shuffled);
    setCurrentVerbIndex(0);
    setIsCardFlipped(false); // Сбрасываем переворот при перемешивании
  }, [shuffledVerbs]);

  const handleFlip = useCallback(() => {
    setIsCardFlipped(!isCardFlipped);
  }, [isCardFlipped]);

  const handleToggleLearned = useCallback(async (verb: Verb) => {
    if (!onVerbUpdate) return;

    // Оптимистичное обновление UI
    const optimisticVerb = { ...verb, learned: !verb.learned };
    const optimisticShuffledVerbs = shuffledVerbs.map((v) =>
      v.id === verb.id ? optimisticVerb : v
    );
    setShuffledVerbs(optimisticShuffledVerbs);
    onVerbUpdate(optimisticVerb);
  }, [onVerbUpdate, shuffledVerbs]);

  const handleDeleteVerb = useCallback(async (verbId: string) => {
    if (!onVerbDelete) return;

    const updatedVerbs = shuffledVerbs.filter(v => v.id !== verbId);
    setShuffledVerbs(updatedVerbs);
    
    if (currentVerbIndex >= updatedVerbs.length && updatedVerbs.length > 0) {
      setCurrentVerbIndex(updatedVerbs.length - 1);
    }
    
    onVerbDelete(verbId);
  }, [onVerbDelete, shuffledVerbs, currentVerbIndex]);

  const handleEditVerb = useCallback((verb: Verb) => {
    onEditVerb?.(verb);
  }, [onEditVerb]);

  // Обработка клавиатуры
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shuffledVerbs.length === 0) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        case ' ':
          event.preventDefault();
          handleFlip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleFlip, shuffledVerbs.length]);

  if (verbs.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        textAlign="center"
        p={3}
      >
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Нет глаголов
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Добавьте первый глагол для начала изучения
        </Typography>
        {onAddVerb && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAddVerb}
            sx={{ mt: 2 }}
          >
            Добавить глагол
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Заголовок и статистика */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" color="primary">
          Просмотр глаголов
        </Typography>
        {shuffledVerbs.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {currentVerbIndex + 1} из {shuffledVerbs.length}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Карточка глагола */}
      {currentVerb && (
        <Box sx={{ mb: 2 }}>
          <VerbCard
            verb={currentVerb}
            isFlipped={isCardFlipped}
            onFlip={handleFlip}
          />
        </Box>
      )}

      {/* Подсказка */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Нажмите на карточку для просмотра спряжений
        </Typography>
      </Box>

      {/* Кнопки управления - как в CardViewer */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <Button
          variant="outlined"
          onClick={handlePrevious}
          startIcon={<ArrowBack />}
          disabled={shuffledVerbs.length <= 1}
          size="medium"
        >
          Назад
        </Button>

        <Button
          variant="contained"
          onClick={handleFlip}
          startIcon={<Flip />}
          sx={{ minWidth: 120 }}
          size="medium"
        >
          Перевернуть
        </Button>

        <Button
          variant="outlined"
          onClick={handleNext}
          endIcon={<ArrowForward />}
          disabled={shuffledVerbs.length <= 1}
          size="medium"
        >
          Вперёд
        </Button>
      </Stack>

      {/* Кнопка перемешивания - по центру */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={handleShuffle}
          startIcon={<Shuffle />}
          color="secondary"
          disabled={shuffledVerbs.length <= 1}
          size="medium"
        >
          Перемешать
        </Button>
      </Box>

      {/* Подсказки по клавиатуре (только на десктопе) */}
      {!isMobile && shuffledVerbs.length > 1 && (
        <Collapse in={true}>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Используйте стрелки ← → для навигации, пробел для перемешивания
            </Typography>
          </Box>
        </Collapse>
      )}
    </Box>
  );
} 