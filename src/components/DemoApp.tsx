'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import { Style, Book, School, AccessTime } from '@mui/icons-material';
import { CardViewer } from './CardViewer';
import { ArticlesTrainer } from './ArticlesTrainer';
import { VerbViewer } from './VerbViewer';
import { TimeTraining } from './TimeTraining';
import { ClientCardService } from '@/services/cardService';
import { ClientVerbService } from '@/services/verbService';
import type { Card, Verb } from '@/types';

type DemoMode = 'cards' | 'articles' | 'verbs' | 'time';

export function DemoApp() {
  const [mode, setMode] = useState<DemoMode>('cards');
  const [cards, setCards] = useState<Card[]>([]);
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [cardData, verbData] = await Promise.all([
          ClientCardService.getCards({ guest: true }),
          ClientVerbService.getVerbs({ guest: true }),
        ]);
        setCards(cardData);
        setVerbs(verbData);
      } catch (err) {
        console.error('Failed to load demo cards', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Не удалось загрузить демо-данные'
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={1}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(180deg, #ffffff 0%, #f7f9fb 100%)',
        }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Demo режим
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Пример работы без логина. Данные читаются из специального
          demo-аккаунта и доступны только для просмотра.
        </Typography>
      </Paper>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_event, value: DemoMode | null) => {
            if (value) setMode(value);
          }}
          color="primary"
        >
          <ToggleButton value="cards" sx={{ gap: 1 }}>
            <Style fontSize="small" />
            Карточки
          </ToggleButton>
          <ToggleButton value="articles" sx={{ gap: 1 }}>
            <Book fontSize="small" />
            Артикли
          </ToggleButton>
          <ToggleButton value="verbs" sx={{ gap: 1 }}>
            <School fontSize="small" />
            Глаголы
          </ToggleButton>
          <ToggleButton value="time" sx={{ gap: 1 }}>
            <AccessTime fontSize="small" />
            Время
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => {
            setError(null);
          }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '40vh',
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {mode === 'cards' && <CardViewer cards={cards} isGuest />}
          {mode === 'articles' && <ArticlesTrainer isGuest />}
          {mode === 'verbs' && <VerbViewer verbs={verbs} />}
          {mode === 'time' && <TimeTraining isGuest />}
        </Stack>
      )}
    </Container>
  );
}
