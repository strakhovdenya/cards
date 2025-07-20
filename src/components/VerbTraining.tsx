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
} from '@mui/material';
import { Refresh, Visibility, CheckCircle, Cancel } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
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
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const AnswerSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
}));

const ConjugationDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(2),
  margin: theme.spacing(2, 0),
}));

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface VerbTrainingProps {
  // Компонент больше не принимает onBack, так как навигация происходит через меню
}

export const VerbTraining: React.FC<VerbTrainingProps> = () => {
  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [currentPerson, setCurrentPerson] = useState<string | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
  });

  const loadNewVerb = async () => {
    setIsLoading(true);
    setError(null);
    setIsAnswerVisible(false);

    try {
      const verb = await getRandomVerb();
      if (verb) {
        setCurrentVerb(verb);
        setCurrentPerson(getRandomPerson());
        setStats((prev) => ({ ...prev, total: prev.total + 1 }));
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
  }, []);

  const handleShowAnswer = () => {
    setIsAnswerVisible(true);
  };

  const handleNextVerb = () => {
    void loadNewVerb();
  };

  const handleCorrectAnswer = () => {
    setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
    handleNextVerb();
  };

  const handleIncorrectAnswer = () => {
    setStats((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
    handleNextVerb();
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
        }}
      >
        <Typography variant="h6" color="primary">
          Тренировка глаголов
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`Всего: ${stats.total}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Правильно: ${stats.correct}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Неправильно: ${stats.incorrect}`}
            color="error"
            variant="outlined"
          />
        </Box>
      </Box>

      <TrainingCard>
        <QuestionSection>
          <Typography variant="h4" component="h2" gutterBottom>
            {currentVerb.infinitive}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
            {currentVerb.translation}
          </Typography>
          <Typography variant="h5" component="h3">
            Лицо: <strong>{currentPerson}</strong>
          </Typography>
        </QuestionSection>

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
            <ConjugationDisplay>
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
            </ConjugationDisplay>
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
