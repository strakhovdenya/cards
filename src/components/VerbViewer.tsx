'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Shuffle,
  Flip,
  Add,
} from '@mui/icons-material';
import { VerbCard } from './VerbCard';
import type { Verb, VerbExamples } from '@/types';

function hasExampleContent(examples: VerbExamples | undefined): boolean {
  return (
    Boolean(examples?.affirmativeSentence) ||
    Boolean(examples?.questionSentence)
  );
}

interface VerbViewerProps {
  verbs: Verb[];
  onVerbUpdate?: (updatedVerb: Verb) => void;
  onVerbDelete?: (id: string) => void;
  onAddVerb?: () => void;
  onEditVerb?: (verb: Verb) => void;
}

export function VerbViewer({ verbs, onAddVerb }: VerbViewerProps) {
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [shuffledVerbs, setShuffledVerbs] = useState<Verb[]>([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showExamplesImmediately, setShowExamplesImmediately] = useState(false);

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
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
        <Box sx={{ mb: { xs: 1, sm: 2 } }}>
          <VerbCard
            verb={currentVerb}
            isFlipped={isCardFlipped}
            onFlip={handleFlip}
          />
        </Box>
      )}

      {/* Примеры предложений (утверждение/вопрос/краткий ответ) */}
      {showExamplesImmediately && hasExampleContent(currentVerb?.examples) && (
        <Box
          sx={{
            mb: { xs: 1, sm: 2 },
            p: 2,
            textAlign: 'left',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            backgroundColor: 'background.paper',
          }}
        >
          {currentVerb?.examples?.affirmativeSentence && (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                Утвердительное
              </Typography>
              <Typography variant="body1">
                {currentVerb.examples.affirmativeSentence}
              </Typography>
              {currentVerb.examples.affirmativeTranslation && (
                <Typography variant="body2" color="text.secondary">
                  {currentVerb.examples.affirmativeTranslation}
                </Typography>
              )}
            </>
          )}

          {currentVerb?.examples?.questionSentence && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Вопрос
              </Typography>
              <Typography variant="body1">
                {currentVerb.examples.questionSentence}
              </Typography>
              {currentVerb.examples.questionTranslation && (
                <Typography variant="body2" color="text.secondary">
                  {currentVerb.examples.questionTranslation}
                </Typography>
              )}
              {currentVerb.examples.shortAnswer && (
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {currentVerb.examples.shortAnswer}
                </Typography>
              )}
              {currentVerb.examples.shortAnswerTranslation && (
                <Typography variant="body2" color="text.secondary">
                  {currentVerb.examples.shortAnswerTranslation}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Подсказка */}
      <Box sx={{ mb: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Нажмите на карточку для просмотра спряжений
        </Typography>
      </Box>

      {/* Кнопки управления - как в CardViewer */}
      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="center"
        sx={{ mb: { xs: 1, sm: 1.5 } }}
      >
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

      {/* Тумблер примеров и перемешивание - согласовано с рядом выше */}
      <Stack
        direction="row"
        spacing={1.5}
        justifyContent="center"
        flexWrap="wrap"
        sx={{ mb: { xs: 1, sm: 1.5 } }}
      >
        <Button
          variant={showExamplesImmediately ? 'contained' : 'outlined'}
          onClick={() => {
            setShowExamplesImmediately((prev) => !prev);
          }}
          size="medium"
        >
          {showExamplesImmediately
            ? 'Скрывать примеры'
            : 'Показывать примеры сразу'}
        </Button>

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
      </Stack>

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
