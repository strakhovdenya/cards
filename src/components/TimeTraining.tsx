'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Cancel,
  Clear,
  Undo,
  Schedule,
  FormatAlignLeft,
  FormatAlignCenter,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { TimeQuestion } from '@/services/timeService';
import { SpeechButton } from './SpeechButton';

const TrainingCard = styled(Card)(() => ({
  maxWidth: 800,
  width: '100%',
  margin: '0 auto',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  overflow: 'hidden',
}));

const QuestionSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const AnswerSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
}));

const WordChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  },
}));

const SelectedWordChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TimeTrainingProps {
  // Компонент не принимает props, так как навигация происходит через меню
}

interface TimeApiResponse {
  data?: TimeQuestion;
  error?: string;
}

type TrainingMode = 'formal' | 'informal';

export const TimeTraining: React.FC<TimeTrainingProps> = () => {
  const [currentQuestion, setCurrentQuestion] = useState<TimeQuestion | null>(
    null
  );
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('formal');
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
  });

  // Перемешанный пул слов для текущего вопроса
  const shuffledWordPool = useMemo(() => {
    if (!currentQuestion) return [];
    return [...currentQuestion.word_pool].sort(() => Math.random() - 0.5);
  }, [currentQuestion]);

  // Правильный ответ для текущего режима
  const correctAnswer = useMemo(() => {
    if (!currentQuestion) return [];
    return trainingMode === 'formal'
      ? currentQuestion.formal_words
      : currentQuestion.informal_words;
  }, [currentQuestion, trainingMode]);

  // Утилита для обработки ответов API
  const handleApiResponse = async (
    response: Response
  ): Promise<TimeQuestion> => {
    if (!response.ok) {
      const errorData = (await response.json()) as TimeApiResponse;
      throw new Error(errorData.error ?? 'Ошибка API');
    }

    const data = (await response.json()) as TimeApiResponse;
    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.data) {
      throw new Error('Invalid API response format');
    }

    return data.data;
  };

  // Загрузка нового вопроса
  const loadNewQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsAnswerVisible(false);
    setIsCorrect(null);
    setSelectedWords([]);

    try {
      const response = await fetch('/api/time/random');
      const question = await handleApiResponse(response);
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error loading question:', error);
      setError(
        `Ошибка при загрузке вопроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Инициализация при загрузке компонента
  useEffect(() => {
    void loadNewQuestion();
    setStats({ total: 0, correct: 0, incorrect: 0 });
  }, [loadNewQuestion]);

  // Обработчики
  const handleWordClick = (word: string) => {
    setSelectedWords((prev) => {
      // Всегда добавляем слово (можно добавлять несколько раз)
      return [...prev, word];
    });
  };

  const handleRemoveWordByIndex = (indexToRemove: number) => {
    setSelectedWords((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleClearAll = () => {
    setSelectedWords([]);
  };

  const handleUndoLast = () => {
    setSelectedWords((prev) => prev.slice(0, -1));
  };

  const handleCheckAnswer = () => {
    if (selectedWords.length === 0) return;

    const userAnswer = selectedWords.join(' ');
    const correctAnswerString = correctAnswer.join(' ');

    const isAnswerCorrect = userAnswer === correctAnswerString;
    setIsCorrect(isAnswerCorrect);
    setIsAnswerVisible(true);

    // Обновляем статистику
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      correct: isAnswerCorrect ? prev.correct + 1 : prev.correct,
      incorrect: isAnswerCorrect ? prev.incorrect : prev.incorrect + 1,
    }));
  };

  const handleNextQuestion = () => {
    void loadNewQuestion();
  };

  const handleRefresh = () => {
    setIsAnswerVisible(false);
    setIsCorrect(null);
    setSelectedWords([]);
    setStats({ total: 0, correct: 0, incorrect: 0 });
    void loadNewQuestion();
  };

  const handleModeChange = (mode: TrainingMode) => {
    setTrainingMode(mode);
    setIsAnswerVisible(false);
    setIsCorrect(null);
    setSelectedWords([]);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Заголовок */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Изучение времени
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Собери фразу из слов и чисел
          </Typography>

          {/* Переключатель режимов */}
          <Box sx={{ mt: 2 }}>
            <ToggleButtonGroup
              value={trainingMode}
              exclusive
              onChange={(e, newMode) => {
                if (newMode !== null) {
                  handleModeChange(newMode as TrainingMode);
                }
              }}
              size="small"
            >
              <ToggleButton value="formal">
                <FormatAlignLeft sx={{ mr: 1 }} />
                Формальное
              </ToggleButton>
              <ToggleButton value="informal">
                <FormatAlignCenter sx={{ mr: 1 }} />
                Неформальное
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Статистика */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            justifyContent: 'space-around',
            textAlign: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" color="primary">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Всего
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="success.main">
              {stats.correct}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Правильно
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="error.main">
              {stats.incorrect}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Неправильно
            </Typography>
          </Box>
        </Paper>

        {/* Основная карточка */}
        <TrainingCard>
          <QuestionSection>
            <Schedule sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Вопрос: {currentQuestion?.time_value}
            </Typography>
            <Typography variant="body1">
              Собери {trainingMode === 'formal' ? 'формальное' : 'неформальное'}{' '}
              описание времени
            </Typography>
          </QuestionSection>

          <AnswerSection>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : currentQuestion ? (
              <>
                {/* Выбранные слова */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Твой ответ:
                  </Typography>
                  <Box
                    sx={{
                      minHeight: 60,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 2,
                    }}
                  >
                    {selectedWords.length > 0 ? (
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {selectedWords.map((word, index) => (
                          <SelectedWordChip
                            key={`${word}-${index}`}
                            label={word}
                            onDelete={() => {
                              handleRemoveWordByIndex(index);
                            }}
                            deleteIcon={<Cancel />}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography
                        color="text.secondary"
                        sx={{ fontStyle: 'italic' }}
                      >
                        Кликай по словам ниже, чтобы составить фразу
                      </Typography>
                    )}
                  </Box>

                  {/* Кнопки управления */}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Undo />}
                      onClick={handleUndoLast}
                      disabled={selectedWords.length === 0}
                    >
                      Отменить последнее
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Clear />}
                      onClick={handleClearAll}
                      disabled={selectedWords.length === 0}
                    >
                      Очистить всё
                    </Button>
                  </Stack>
                </Box>

                {/* Пул слов */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Доступные слова:
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: 1,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    {shuffledWordPool.map((word, index) => (
                      <WordChip
                        key={`${word}-${index}`}
                        label={word}
                        variant="outlined"
                        onClick={() => {
                          handleWordClick(word);
                        }}
                        color={
                          selectedWords.includes(word) ? 'primary' : 'default'
                        }
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          height: '28px',
                          '& .MuiChip-label': {
                            px: 1,
                            py: 0.5,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Кнопки действий */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleCheckAnswer}
                    disabled={selectedWords.length === 0}
                  >
                    {isAnswerVisible ? 'Проверить снова' : 'Проверить ответ'}
                  </Button>

                  {isAnswerVisible && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleNextQuestion}
                      size="large"
                    >
                      Следующий вопрос
                    </Button>
                  )}
                </Box>

                {/* Результат */}
                {isAnswerVisible && (
                  <Box sx={{ mt: 3 }}>
                    <Alert
                      severity={isCorrect ? 'success' : 'error'}
                      sx={{ mb: 2 }}
                    >
                      {isCorrect ? 'Правильно!' : 'Неправильно!'}
                    </Alert>

                    <Paper
                      sx={{ p: 2, bgcolor: 'grey.50', position: 'relative' }}
                    >
                      <Typography variant="h6" gutterBottom>
                        Правильный ответ:
                      </Typography>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontFamily: 'monospace', flex: 1 }}
                        >
                          {correctAnswer.join(' ')}
                        </Typography>
                        <SpeechButton
                          text={correctAnswer.join(' ')}
                          tooltip="Произнести правильный ответ"
                          size="small"
                          enableHotkey={false}
                        />
                      </Box>
                    </Paper>
                  </Box>
                )}
              </>
            ) : null}
          </AnswerSection>
        </TrainingCard>

        {/* Кнопка обновления */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Начать заново
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
