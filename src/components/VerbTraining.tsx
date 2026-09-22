'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Fade,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Refresh, Visibility, CheckCircle, Cancel } from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import type { Verb } from '@/types';
import {
  getRandomVerb,
  getRandomPerson,
  getConjugationForPerson,
} from '@/services/verbService';

const TrainingCard = styled(Card)(() => ({
  maxWidth: 600,
  width: '100%',
  margin: '0 auto',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  overflow: 'hidden',
}));

const QuestionSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.primary.main,
}));

const AnswerSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
}));

const ConjugationDisplay = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'feedback',
})<{ feedback?: 'correct' | 'incorrect' | null }>(({ theme, feedback }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  backgroundColor:
    feedback === 'correct'
      ? alpha(theme.palette.success.main, 0.12)
      : feedback === 'incorrect'
        ? alpha(theme.palette.error.main, 0.12)
        : theme.palette.grey[50],
  borderRadius: theme.spacing(2),
  margin: theme.spacing(2, 0),
  border: '2px solid',
  borderColor:
    feedback === 'correct'
      ? theme.palette.success.main
      : feedback === 'incorrect'
        ? theme.palette.error.main
        : 'transparent',
  transition:
    'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out',
}));

interface VerbTrainingProps {
  // Компонент больше не принимает onBack, так как навигация происходит через меню
}

export const VerbTraining: React.FC<VerbTrainingProps> = () => {
  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [currentPerson, setCurrentPerson] = useState<string | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(
    null
  );
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
  });

  const FEEDBACK_DELAY_MS = 350;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const loadNewVerb = async () => {
    setIsLoading(true);
    setError(null);
    setIsAnswerVisible(false);

    try {
      const verb = await getRandomVerb();
      if (verb) {
        setCurrentVerb(verb);
        setCurrentPerson(getRandomPerson());
        // Не увеличиваем stats.total здесь!
      } else {
        setError('Не удалось загрузить глагол');
      }
    } catch (error) {
      console.error('Error loading verb:', error);
      setError('Ошибка при загрузке глагола');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNewVerb();
    // Сброс статистики при старте тренировки
    setStats({ total: 0, correct: 0, incorrect: 0 });
  }, []);

  const handleShowAnswer = () => {
    setIsAnswerVisible(true);
  };

  const handleNextVerb = () => {
    setFeedback(null);
    void loadNewVerb();
  };

  const handleCorrectAnswer = () => {
    setStats((prev) => ({
      ...prev,
      correct: prev.correct + 1,
      total: prev.total + 1,
    }));
    setFeedback('correct');
    setTimeout(handleNextVerb, FEEDBACK_DELAY_MS);
  };

  const handleIncorrectAnswer = () => {
    setStats((prev) => ({
      ...prev,
      incorrect: prev.incorrect + 1,
      total: prev.total + 1,
    }));
    setFeedback('incorrect');
    setTimeout(handleNextVerb, FEEDBACK_DELAY_MS);
  };

  const currentConjugation =
    currentVerb && currentPerson
      ? getConjugationForPerson(currentVerb, currentPerson)
      : null;

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
            void loadNewVerb();
          }}
        >
          Попробовать снова
        </Button>
      </Box>
    );
  }

  if (!currentVerb || !currentPerson) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="h6" color="text.secondary">
          Нет доступных глаголов для тренировки
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Статистика */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap', // Добавлено для переноса
          gap: 1.5, // Чуть больше для мобильных
        }}
      >
        <Typography variant="h6" color="primary">
          Тренировка глаголов
        </Typography>
        <Box
          sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap' }}
        >
          <Chip
            label={`Всего: ${stats.total}`}
            color="primary"
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
          />
          <Chip
            label={`Правильно: ${stats.correct}`}
            color="success"
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
          />
          <Chip
            label={`Неправильно: ${stats.incorrect}`}
            color="error"
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
          />
        </Box>
      </Box>

      <TrainingCard>
        <Fade in key={currentVerb.id} timeout={250}>
          <QuestionSection>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              fontWeight={600}
            >
              {currentVerb.infinitive}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              {currentVerb.translation}
            </Typography>
            <Chip
              label={
                <>
                  Лицо: <strong>{currentPerson}</strong>
                </>
              }
              color="primary"
              variant="outlined"
            />
          </QuestionSection>
        </Fade>

        <AnswerSection>
          {!isAnswerVisible ? (
            <Box textAlign="center">
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Попробуйте вспомнить правильную форму глагола
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  handleShowAnswer();
                }}
                startIcon={<Visibility />}
                sx={{ mt: 2 }}
              >
                Показать ответ
              </Button>
            </Box>
          ) : (
            <Fade in timeout={200}>
              <ConjugationDisplay feedback={feedback}>
                <Typography variant="h6" color="primary" gutterBottom>
                  Правильная форма:
                </Typography>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {currentConjugation?.form}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {currentConjugation?.translation}
                </Typography>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleIncorrectAnswer}
                    startIcon={<Cancel />}
                    disabled={feedback !== null}
                  >
                    Неправильно
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCorrectAnswer}
                    startIcon={<CheckCircle />}
                    disabled={feedback !== null}
                  >
                    Правильно
                  </Button>
                </Box>
              </ConjugationDisplay>
            </Fade>
          )}
        </AnswerSection>

        <CardActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button
            variant="outlined"
            onClick={handleNextVerb}
            startIcon={<Refresh />}
          >
            Следующий глагол
          </Button>
        </CardActions>
      </TrainingCard>
    </Box>
  );
};
