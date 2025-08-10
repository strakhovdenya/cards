'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  VolumeUp,
  Shuffle,
  ArrowBack,
  ArrowForward,
  Keyboard,
  KeyboardHide,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { Verb } from '@/types';
import { getVerbs } from '@/services/verbService';
import { useSpeech } from '@/services/speechService';
import { FrontSideToggle, type FrontSide } from './navigation/FrontSideToggle';

const StudyCard = styled(Card)(() => ({
  maxWidth: 600,
  width: '100%',
  margin: '0 auto',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  overflow: 'hidden',
}));

const QuestionSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.primary.main,
}));

const AnswerSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
}));

const TranslationDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  backgroundColor: '#e3f2fd',
  borderRadius: theme.spacing(2),
  margin: theme.spacing(2, 0),
  border: `2px solid ${theme.palette.primary.light}`,
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface VerbStudyProps {
  // Компонент для изучения инфинитивов глаголов
  // Пока не требует дополнительных пропсов
}

export const VerbStudy: React.FC<VerbStudyProps> = () => {
  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [allVerbs, setAllVerbs] = useState<Verb[]>([]);
  const [shuffledVerbs, setShuffledVerbs] = useState<Verb[]>([]);
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [frontSide, setFrontSide] = useState<FrontSide>('german');
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
  });

  const { speak, isSupported } = useSpeech();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const loadVerbs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const verbs = await getVerbs();
      setAllVerbs(verbs);
      setShuffledVerbs([...verbs]);
      setCurrentVerbIndex(0);

      if (verbs.length > 0) {
        setCurrentVerb(verbs[0]);
      }
    } catch (error) {
      console.error('Error loading verbs:', error);
      setError('Ошибка при загрузке глаголов');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNewVerb = useCallback(() => {
    if (shuffledVerbs.length === 0) {
      setError('Нет доступных глаголов');
      return;
    }

    setIsAnswerVisible(false);
    setCurrentVerb(shuffledVerbs[currentVerbIndex]);
  }, [shuffledVerbs, currentVerbIndex]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...allVerbs].sort(() => Math.random() - 0.5);
    setShuffledVerbs(shuffled);
    setCurrentVerbIndex(0);
    setCurrentVerb(shuffled[0]);
    setIsAnswerVisible(false);
  }, [allVerbs]);

  const handleNextVerb = useCallback(() => {
    const nextIndex = (currentVerbIndex + 1) % shuffledVerbs.length;
    setCurrentVerbIndex(nextIndex);
    setCurrentVerb(shuffledVerbs[nextIndex]);
    setIsAnswerVisible(false);
  }, [currentVerbIndex, shuffledVerbs]);

  const handlePreviousVerb = useCallback(() => {
    const prevIndex =
      (currentVerbIndex - 1 + shuffledVerbs.length) % shuffledVerbs.length;
    setCurrentVerbIndex(prevIndex);
    setCurrentVerb(shuffledVerbs[prevIndex]);
    setIsAnswerVisible(false);
  }, [currentVerbIndex, shuffledVerbs]);

  const handleShowAnswer = useCallback(() => {
    setIsAnswerVisible(true);
  }, []);

  const handleCorrectAnswer = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      correct: prev.correct + 1,
      total: prev.total + 1,
    }));
    handleNextVerb();
  }, [handleNextVerb]);

  const handleIncorrectAnswer = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      incorrect: prev.incorrect + 1,
      total: prev.total + 1,
    }));
    handleNextVerb();
  }, [handleNextVerb]);

  const handleSpeak = useCallback(
    async (text: string, event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }

      if (!isSupported()) {
        console.warn('Speech synthesis is not supported');
        return;
      }

      if (!text.trim()) {
        return;
      }

      setIsSpeaking(true);
      try {
        await speak(text, {
          lang: 'de-DE',
          rate: 0.8, // Немного медленнее для лучшего понимания
        });
      } catch (error) {
        console.error('Speech error:', error);
      } finally {
        setIsSpeaking(false);
      }
    },
    [speak, isSupported]
  );

  const toggleKeyboardHints = useCallback(() => {
    setShowKeyboardHints((prev) => !prev);
  }, []);

  // Клавиатурные сокращения для быстрой навигации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const canNavigate = shuffledVerbs.length > 1;

      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (canNavigate) {
            event.preventDefault();
            handlePreviousVerb();
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (canNavigate) {
            event.preventDefault();
            handleNextVerb();
          }
          break;
        case ' ':
        case 'Space':
          event.preventDefault();
          if (!isAnswerVisible) {
            handleShowAnswer();
          }
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
          if (isAnswerVisible) {
            handleCorrectAnswer();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (isAnswerVisible) {
            handleIncorrectAnswer();
          }
          break;
        case 'p':
        case 'P':
          event.preventDefault();
          if (currentVerb) {
            void handleSpeak(currentVerb.infinitive);
          }
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          setFrontSide((prev) => (prev === 'german' ? 'russian' : 'german'));
          setIsAnswerVisible(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleNextVerb,
    handlePreviousVerb,
    handleShuffle,
    handleShowAnswer,
    handleCorrectAnswer,
    handleIncorrectAnswer,
    shuffledVerbs.length,
    isAnswerVisible,
    currentVerb,
    handleSpeak,
    frontSide,
  ]);

  // На десктопе показываем подсказки по умолчанию, на мобильном - скрываем
  useEffect(() => {
    setShowKeyboardHints(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    void loadVerbs();
    // Сброс статистики при старте изучения
    setStats({ total: 0, correct: 0, incorrect: 0 });
  }, []);

  useEffect(() => {
    if (shuffledVerbs.length > 0) {
      loadNewVerb();
    }
  }, [shuffledVerbs, currentVerbIndex, loadNewVerb]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => {
            void loadVerbs();
          }}
        >
          Попробовать снова
        </Button>
      </Box>
    );
  }

  if (!currentVerb) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="text.secondary">
          Нет доступных глаголов для изучения
        </Typography>
      </Box>
    );
  }

  // Определяем что показывать на лицевой стороне
  const frontText =
    frontSide === 'german' ? currentVerb?.infinitive : currentVerb?.translation;
  const backText =
    frontSide === 'german' ? currentVerb?.translation : currentVerb?.infinitive;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Статистика */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography variant="h6" color="primary">
          Изучение глаголов
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${currentVerbIndex + 1} из ${shuffledVerbs.length}`}
            color="info"
            variant="outlined"
            sx={{ mb: { xs: 1, sm: 0 } }}
          />
          <Chip
            label={`Всего: ${stats.total}`}
            color="primary"
            variant="outlined"
            sx={{ mb: { xs: 1, sm: 0 } }}
          />
          <Chip
            label={`Правильно: ${stats.correct}`}
            color="success"
            variant="outlined"
            sx={{ mb: { xs: 1, sm: 0 } }}
          />
          <Chip
            label={`Неправильно: ${stats.incorrect}`}
            color="error"
            variant="outlined"
            sx={{ mb: { xs: 1, sm: 0 } }}
          />
        </Box>
      </Box>

      {/* Переключатель лицевой стороны */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
        }}
      >
        <FrontSideToggle
          value={frontSide}
          onChange={(newFrontSide) => {
            setFrontSide(newFrontSide);
            setIsAnswerVisible(false); // Сбрасываем флип при смене режима
          }}
        />
      </Box>

      <StudyCard>
        <QuestionSection
          onClick={() => {
            if (!isAnswerVisible) {
              handleShowAnswer();
            }
          }}
          sx={{
            cursor: !isAnswerVisible ? 'pointer' : 'default',
            '&:hover': !isAnswerVisible
              ? {
                  backgroundColor: 'grey.50',
                  transition: 'background-color 0.2s ease-in-out',
                }
              : {},
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom fontWeight={600}>
            {frontText}
          </Typography>
          {isSupported() && frontSide === 'german' && (
            <Tooltip title="Произнести глагол">
              <SpeechButton
                size="small"
                onClick={(event) => {
                  void handleSpeak(currentVerb.infinitive, event);
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
        </QuestionSection>

        <AnswerSection
          onClick={() => {
            if (!isAnswerVisible) {
              handleShowAnswer();
            }
          }}
          sx={{
            cursor: !isAnswerVisible ? 'pointer' : 'default',
            '&:hover': !isAnswerVisible
              ? {
                  backgroundColor: 'grey.50',
                  transition: 'background-color 0.2s ease-in-out',
                }
              : {},
          }}
        >
          {!isAnswerVisible ? (
            <Box textAlign="center">
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Нажмите на карточку, чтобы увидеть перевод
              </Typography>
            </Box>
          ) : (
            <TranslationDisplay>
              <Typography variant="h6" color="primary" gutterBottom>
                Правильный перевод:
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold">
                {backText}
              </Typography>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleIncorrectAnswer}
                  startIcon={<Cancel />}
                >
                  Неправильно
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleCorrectAnswer}
                  startIcon={<CheckCircle />}
                >
                  Правильно
                </Button>
              </Box>
            </TranslationDisplay>
          )}
        </AnswerSection>
      </StudyCard>

      {/* Основная подсказка */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {isAnswerVisible
            ? 'Нажмите "Правильно" или "Неправильно" для оценки'
            : 'Нажмите на карточку или кнопку "Показать перевод" для изучения'}
        </Typography>

        {/* Кнопка для показа/скрытия горячих клавиш */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Tooltip
            title={
              showKeyboardHints
                ? 'Скрыть горячие клавиши'
                : 'Показать горячие клавиши'
            }
          >
            <IconButton
              size="small"
              onClick={toggleKeyboardHints}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {showKeyboardHints ? <KeyboardHide /> : <Keyboard />}
            </IconButton>
          </Tooltip>
          {!isMobile && (
            <Typography variant="caption" color="text.disabled">
              {showKeyboardHints ? 'Скрыть' : 'Горячие клавиши'}
            </Typography>
          )}
        </Box>

        {/* Горячие клавиши */}
        <Collapse in={showKeyboardHints}>
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              backgroundColor: 'grey.50',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: '500' }}
            >
              ⌨️ Горячие клавиши:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip label="← →" size="small" variant="outlined" />
              <Chip label="Пробел" size="small" variant="outlined" />
              <Chip label="Enter" size="small" variant="outlined" />
              <Chip label="Esc" size="small" variant="outlined" />
              <Chip label="S" size="small" variant="outlined" />
              <Chip label="P" size="small" variant="outlined" />
              <Chip label="F" size="small" variant="outlined" />
            </Stack>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 1, display: 'block' }}
            >
              Навигация • Показать перевод • Правильно • Неправильно •
              Перемешать • Произношение • Сменить режим
            </Typography>
          </Box>
        </Collapse>
      </Box>

      {/* Кнопки управления */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <Button
          variant="outlined"
          onClick={handlePreviousVerb}
          startIcon={<ArrowBack />}
          disabled={shuffledVerbs.length <= 1}
          size="medium"
        >
          Назад
        </Button>

        <Button
          variant="contained"
          onClick={handleShowAnswer}
          startIcon={<Visibility />}
          sx={{ minWidth: 120 }}
          size="medium"
          disabled={isAnswerVisible}
        >
          Показать перевод
        </Button>

        <Button
          variant="outlined"
          onClick={handleNextVerb}
          endIcon={<ArrowForward />}
          disabled={shuffledVerbs.length <= 1}
          size="medium"
        >
          Вперёд
        </Button>
      </Stack>

      {/* Кнопка перемешивания */}
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
    </Box>
  );
};
