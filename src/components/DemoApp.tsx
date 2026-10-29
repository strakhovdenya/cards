'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Box, Alert, Button, Chip, CircularProgress } from '@mui/material';
import { CenteredColumn } from './layout/CenteredColumn';
import { AppShell } from './AppShell';
import { StudyNavigation } from './navigation/StudyNavigation';
import { CardViewer } from './CardViewer';
import { ArticlesTrainer } from './ArticlesTrainer';
import { VerbViewer } from './VerbViewer';
import { VerbTraining } from './VerbTraining';
import { VerbStudy } from './VerbStudy';
import { TimeTraining } from './TimeTraining';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { ClientCardService } from '@/services/cardService';
import { ClientVerbService } from '@/services/verbService';
import {
  getStudyScreenSubtitle,
  type StudyScreen,
} from '@/utils/navigationUtils';
import type { Card, Verb } from '@/types';

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
  const [screen, setScreen] = useState<StudyScreen>('cards');
  const [isStudyMenuOpen, setIsStudyMenuOpen] = useState(false);
  const cards = useGuestSection<Card>(fetchGuestCards, 'cards');
  const verbs = useGuestSection<Verb>(fetchGuestVerbs, 'verbs');
  const progress = useDemoProgress(cards.data);

  const screens: Record<StudyScreen, () => ReactNode> = {
    cards: () => (
      <DataSection
        isLoading={cards.isLoading}
        error={cards.error}
        onRetry={() => void cards.reload()}
      >
        <CardViewer
          cards={progress.cards}
          isGuest
          onGuestToggleLearned={progress.toggleLearned}
        />
      </DataSection>
    ),
    articles: () => <ArticlesTrainer isGuest />,
    'verbs-view': () => (
      <DataSection
        isLoading={verbs.isLoading}
        error={verbs.error}
        onRetry={() => void verbs.reload()}
      >
        <VerbViewer verbs={verbs.data} />
      </DataSection>
    ),
    'verbs-training': () => <VerbTraining isGuest />,
    'verbs-study': () => <VerbStudy isGuest />,
    time: () => <TimeTraining isGuest />,
  };

  return (
    <AppShell
      subtitle={getStudyScreenSubtitle(screen)}
      headerEnd={
        <Chip
          label="Гость"
          size="small"
          sx={{
            flexShrink: 0,
            color: 'inherit',
            bgcolor: 'rgba(255,255,255,0.15)',
            fontWeight: 600,
          }}
        />
      }
      navigationValue="study"
      onStudyClick={() => {
        setIsStudyMenuOpen(true);
      }}
      onEditClick={() => undefined}
      isEditDisabled
    >
      <StudyNavigation
        open={isStudyMenuOpen}
        onClose={() => {
          setIsStudyMenuOpen(false);
        }}
        onSelect={setScreen}
      />
      <CenteredColumn sx={{ py: 2, px: 2 }}>{screens[screen]()}</CenteredColumn>
    </AppShell>
  );
}
