'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
          label={`Верно: ${correctCount}`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`Ошибки: ${errorCount}`}
          color="error"
          variant="outlined"
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
      </Paper>

      {/* Выбор артикля */}
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        {(['der', 'die', 'das'] as const).map((art) => {
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
              variant="contained"
              color={color}
              onClick={() => {
                if (!current || answerResult) return;
                const isCorrect = correctArticle === art;
                setSelectedArticle(art);
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
          variant="outlined"
          endIcon={<ArrowForward />}
          onClick={next}
          disabled={filtered.length <= 1}
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
    </Box>
  );
}
