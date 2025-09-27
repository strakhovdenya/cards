'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Box, Button, Chip, Stack, Typography, Paper } from '@mui/material';
import { ArrowBack, ArrowForward, Shuffle } from '@mui/icons-material';
import { ClientNounService } from '@/services/nounService';
import { ClientTagService } from '@/services/tagService';
import { TagFilter } from './TagFilter';
import type { Card, Tag } from '@/types';

export function ArticlesTrainer() {
  const [nouns, setNouns] = useState<Card[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [answerResult, setAnswerResult] = useState<null | 'correct' | 'wrong'>(
    null
  );
  const [selectedArticle, setSelectedArticle] = useState<
    null | 'der' | 'die' | 'das'
  >(null);
  const [flyingAnswer, setFlyingAnswer] = useState<{
    isFlying: boolean;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    article: string;
    isCorrect: boolean;
  } | null>(null);

  // Refs для получения позиций элементов
  const articleButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const correctCounterRef = useRef<HTMLDivElement | null>(null);
  const errorCounterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [n, t] = await Promise.all([
          ClientNounService.getNouns(),
          ClientTagService.getTags(),
        ]);
        setNouns(n);
        setAvailableTags(t);
      } catch (e) {
        console.error('Failed to load nouns or tags', e);
      }
    };
    void load();
  }, []);

  // Обработчик изменения размера окна - сбрасываем летящий ответ
  useEffect(() => {
    const handleResize = () => {
      if (flyingAnswer) {
        setFlyingAnswer(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [flyingAnswer]);

  const filtered = useMemo(() => {
    if (selectedTagIds.size === 0) return nouns;
    return nouns.filter((card) =>
      (card.tags ?? []).some((tag) => selectedTagIds.has(tag.id))
    );
  }, [nouns, selectedTagIds]);

  // Текущий порядок показа слов (рандомизируется)
  const [ordered, setOrdered] = useState<Card[]>([]);

  // Перестраиваем порядок при изменении фильтра
  useEffect(() => {
    const next = [...filtered].sort(() => Math.random() - 0.5);
    setOrdered(next);
    setCurrentIndex(0);
    setCorrectCount(0);
    setErrorCount(0);
    setAnswerResult(null);
    setSelectedArticle(null);
  }, [filtered]);

  const current = ordered[currentIndex];

  const baseForm = current?.base_form ?? current?.germanWord ?? '';

  const onTagToggle = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const onSelectAllTags = useCallback(() => {
    setSelectedTagIds(new Set(availableTags.map((t) => t.id)));
  }, [availableTags]);

  const onClearTagSelection = useCallback(() => {
    setSelectedTagIds(new Set());
  }, []);

  const startFlyingAnimation = useCallback(
    (article: string, isCorrect: boolean, buttonIndex: number) => {
      const button = articleButtonRefs.current[buttonIndex];
      const targetCounter = isCorrect
        ? correctCounterRef.current
        : errorCounterRef.current;

      if (!button || !targetCounter) return;

      // Функция для получения точных координат
      const getElementCenter = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const scrollX =
          window.pageXOffset || document.documentElement.scrollLeft || 0;
        const scrollY =
          window.pageYOffset || document.documentElement.scrollTop || 0;

        return {
          x: rect.left + scrollX + rect.width / 2,
          y: rect.top + scrollY + rect.height / 2,
        };
      };

      // Получаем центры элементов
      const fromCenter = getElementCenter(button);
      const toCenter = getElementCenter(targetCounter);

      setFlyingAnswer({
        isFlying: true,
        fromX: fromCenter.x,
        fromY: fromCenter.y,
        toX: toCenter.x,
        toY: toCenter.y,
        article,
        isCorrect,
      });

      // Останавливаем анимацию через 800ms
      setTimeout(() => {
        setFlyingAnswer(null);
      }, 800);
    },
    []
  );

  const next = useCallback(() => {
    if (ordered.length === 0) return;
    setCurrentIndex((i) => (i + 1) % ordered.length);
    setAnswerResult(null);
    setSelectedArticle(null);
  }, [ordered.length]);

  const prev = useCallback(() => {
    if (ordered.length === 0) return;
    setCurrentIndex((i) => (i - 1 + ordered.length) % ordered.length);
    setAnswerResult(null);
    setSelectedArticle(null);
  }, [ordered.length]);

  const shuffle = useCallback(() => {
    // Перестраиваем список согласно текущей фильтрации и рандомному порядку
    const next = [...filtered].sort(() => Math.random() - 0.5);
    setOrdered(next);
    setCurrentIndex(0);
    setCorrectCount(0);
    setErrorCount(0);
    setAnswerResult(null);
    setSelectedArticle(null);
  }, [filtered]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* Счётчики */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Chip
          label={`Всего: ${filtered.length}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          ref={correctCounterRef}
          label={`Верно: ${correctCount}`}
          color="success"
          variant="outlined"
          sx={{
            animation:
              answerResult === 'correct' ? 'bounceIn 0.6s ease-out' : 'none',
            '@keyframes bounceIn': {
              '0%': {
                transform: 'scale(0.3)',
                opacity: 0,
              },
              '50%': {
                transform: 'scale(1.1)',
              },
              '70%': {
                transform: 'scale(0.9)',
              },
              '100%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            },
          }}
        />
        <Chip
          ref={errorCounterRef}
          label={`Ошибки: ${errorCount}`}
          color="error"
          variant="outlined"
          sx={{
            animation:
              answerResult === 'wrong' ? 'shakeIn 0.6s ease-out' : 'none',
            '@keyframes shakeIn': {
              '0%, 100%': {
                transform: 'translateX(0)',
              },
              '10%, 30%, 50%, 70%, 90%': {
                transform: 'translateX(-3px)',
              },
              '20%, 40%, 60%, 80%': {
                transform: 'translateX(3px)',
              },
            },
          }}
        />
      </Stack>

      {/* Фильтр тегов */}
      <TagFilter
        availableTags={availableTags}
        selectedTagIds={selectedTagIds}
        onTagToggle={onTagToggle}
        onSelectAllTags={onSelectAllTags}
        onClearTagSelection={onClearTagSelection}
      />

      {/* Слово без артикля — карточка */}
      <Paper
        elevation={3}
        sx={{
          my: 3,
          px: { xs: 3, sm: 4 },
          py: { xs: 4, sm: 5 },
          borderRadius: 3,
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
          {baseForm}
        </Typography>
        {current?.translation && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              color: 'text.secondary',
              mt: 2,
              opacity: 0.8,
            }}
          >
            {current.translation}
          </Typography>
        )}
      </Paper>

      {/* Выбор артикля */}
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        {(['der', 'die', 'das'] as const).map((art, index) => {
          const correctArticle = (() => {
            const gd = current?.grammar_data;
            const article =
              typeof gd?.article === 'string'
                ? gd?.article.toLowerCase()
                : undefined;
            return article;
          })();
          const isAnswered = answerResult !== null;
          const isCorrectButton = isAnswered && art === correctArticle;
          const isWrongSelected =
            isAnswered && selectedArticle === art && art !== correctArticle;

          let color: 'primary' | 'success' = 'primary';
          if (isCorrectButton) color = 'success';

          return (
            <Button
              key={art}
              ref={(el) => {
                articleButtonRefs.current[index] = el;
              }}
              variant="contained"
              color={color}
              onClick={() => {
                if (!current || answerResult) return;
                const isCorrect = correctArticle === art;
                setSelectedArticle(art);

                // Запускаем анимацию полета
                startFlyingAnimation(art, isCorrect, index);

                if (isCorrect) setCorrectCount((c) => c + 1);
                else setErrorCount((c) => c + 1);
                setAnswerResult(isCorrect ? 'correct' : 'wrong');
              }}
              disabled={!current}
              sx={{
                minWidth: 90,
                height: 44,
                borderRadius: '14px',
                boxShadow: 3,
                textTransform: 'none',
                fontWeight: 700,
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: isWrongSelected ? 'error.main' : 'transparent',
                '&:hover': {
                  boxShadow: 4,
                },
              }}
            >
              {art}
            </Button>
          );
        })}
      </Stack>

      {/* Результат ответа (перенесён ниже навигации и оформлен как кнопка без эффектов) */}

      {/* Навигация */}
      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={prev}
          disabled={filtered.length <= 1}
        >
          Назад
        </Button>
        <Button
          variant="outlined"
          startIcon={<Shuffle />}
          onClick={shuffle}
          disabled={filtered.length <= 1}
          color="error"
          sx={{
            borderRadius: '12px',
            borderWidth: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 2,
            '&.MuiButton-outlinedError': {
              borderColor: 'error.light',
              color: 'error.main',
            },
          }}
        >
          Перемешать
        </Button>
        <Button
          variant={answerResult !== null ? 'contained' : 'outlined'}
          color={answerResult !== null ? 'success' : undefined}
          endIcon={<ArrowForward />}
          onClick={next}
          disabled={filtered.length <= 1}
          sx={
            answerResult !== null
              ? {
                  boxShadow: 4,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'scale(1.02)',
                  },
                  '@keyframes pulse': {
                    '0%': {
                      boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)',
                    },
                    '70%': {
                      boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
                    },
                    '100%': {
                      boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
                    },
                  },
                }
              : {}
          }
        >
          Вперёд
        </Button>
      </Stack>

      {answerResult && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            width: '100%',
            maxWidth: 600,
            borderRadius: '12px',
            border: '2px solid',
            borderColor:
              answerResult === 'correct' ? 'success.light' : 'error.light',
            color: answerResult === 'correct' ? 'success.main' : 'error.main',
            textAlign: 'center',
            py: 1.25,
            fontWeight: 700,
            userSelect: 'none',
            backgroundColor: 'transparent',
          }}
        >
          {answerResult === 'correct' ? 'Верно' : 'Неверно'}
        </Paper>
      )}

      {/* Летящий ответ */}
      {flyingAnswer && (
        <Box
          sx={{
            position: 'absolute',
            left: flyingAnswer.fromX,
            top: flyingAnswer.fromY,
            zIndex: 9999,
            pointerEvents: 'none',
            animation:
              'flyToCounter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            '@keyframes flyToCounter': {
              '0%': {
                transform: 'translate(0, 0) scale(1) rotate(0deg)',
                opacity: 1,
              },
              '25%': {
                transform: `translate(${(flyingAnswer.toX - flyingAnswer.fromX) * 0.25}px, ${(flyingAnswer.toY - flyingAnswer.fromY) * 0.05}px) scale(1.15) rotate(5deg)`,
                opacity: 0.95,
              },
              '50%': {
                transform: `translate(${(flyingAnswer.toX - flyingAnswer.fromX) * 0.5}px, ${(flyingAnswer.toY - flyingAnswer.fromY) * 0.3}px) scale(1.3) rotate(-5deg)`,
                opacity: 0.8,
              },
              '75%': {
                transform: `translate(${(flyingAnswer.toX - flyingAnswer.fromX) * 0.75}px, ${(flyingAnswer.toY - flyingAnswer.fromY) * 0.7}px) scale(1.1) rotate(2deg)`,
                opacity: 0.6,
              },
              '100%': {
                transform: `translate(${flyingAnswer.toX - flyingAnswer.fromX}px, ${flyingAnswer.toY - flyingAnswer.fromY}px) scale(0.1) rotate(0deg)`,
                opacity: 0,
              },
            },
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: flyingAnswer.isCorrect
                ? 'success.main'
                : 'error.main',
              color: 'white',
              fontWeight: 700,
              fontSize: '1.1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '2px solid white',
            }}
          >
            {flyingAnswer.article}
          </Box>
        </Box>
      )}
    </Box>
  );
}
