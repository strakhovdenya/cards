'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import { CenteredColumn } from './layout/CenteredColumn';
import { Style, Book, School, AccessTime } from '@mui/icons-material';
import { CardViewer } from './CardViewer';
import { ArticlesTrainer } from './ArticlesTrainer';
import { VerbViewer } from './VerbViewer';
import { TimeTraining } from './TimeTraining';
import { ClientCardService } from '@/services/cardService';
import { ClientVerbService } from '@/services/verbService';
import type { Card, Verb } from '@/types';

type DemoMode = 'cards' | 'articles' | 'verbs' | 'time';

const LOAD_ERROR_MESSAGE = 'Не удалось загрузить демо-данные';

interface SectionState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function useGuestSection<T>(
  fetchItems: () => Promise<T[]>,
  logLabel: string
): SectionState<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  const reload = useCallback(async () => {
    latestRequestId.current += 1;
    const requestId = latestRequestId.current;
    const isStale = () => requestId !== latestRequestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchItems();
      if (!isStale()) setData(items);
    } catch (loadError) {
      console.error(`Failed to load demo ${logLabel}`, loadError);
      if (isStale()) return;
      setError(
        loadError instanceof Error ? loadError.message : LOAD_ERROR_MESSAGE
      );
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, [fetchItems, logLabel]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}

const fetchGuestCards = () => ClientCardService.getCards({ guest: true });
const fetchGuestVerbs = () => ClientVerbService.getVerbs({ guest: true });

interface DataSectionProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}

function DataSection({
  isLoading,
  error,
  onRetry,
  children,
}: DataSectionProps) {
  if (isLoading) {
    return (
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
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Повторить
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return <>{children}</>;
}

export function DemoApp() {
  const [mode, setMode] = useState<DemoMode>('cards');
  const cards = useGuestSection<Card>(fetchGuestCards, 'cards');
  const verbs = useGuestSection<Verb>(fetchGuestVerbs, 'verbs');

  return (
    <CenteredColumn sx={{ py: 4, px: 2 }}>
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

      <Stack spacing={3}>
        {mode === 'cards' && (
          <DataSection
            isLoading={cards.isLoading}
            error={cards.error}
            onRetry={() => void cards.reload()}
          >
            <CardViewer cards={cards.data} isGuest />
          </DataSection>
        )}
        {mode === 'articles' && <ArticlesTrainer isGuest />}
        {mode === 'verbs' && (
          <DataSection
            isLoading={verbs.isLoading}
            error={verbs.error}
            onRetry={() => void verbs.reload()}
          >
            <VerbViewer verbs={verbs.data} />
          </DataSection>
        )}
        {mode === 'time' && <TimeTraining isGuest />}
      </Stack>
    </CenteredColumn>
  );
}
