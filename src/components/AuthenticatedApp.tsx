/* eslint-disable @typescript-eslint/no-misused-promises */
'use client';

import { useState, type ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
} from '@mui/material';
import { CenteredColumn } from './layout/CenteredColumn';
import { ArrowBack, Upload } from '@mui/icons-material';
import { AppShell } from './AppShell';
import { ModeSelectSheet } from './navigation/ModeSelectSheet';
import { StudyNavigation } from './navigation/StudyNavigation';
import { App } from './App';
import { ArticlesTrainer } from './ArticlesTrainer';
import { InviteManager } from './auth/InviteManager';
import { VerbTraining } from './VerbTraining';
import { VerbEditor } from './VerbEditor';
import { TagManager } from './TagManager';
import { BulkImport } from './BulkImport';
import { BulkVerbImport } from './BulkVerbImport';
import { BulkNounImport } from './BulkNounImport';
import { VerbViewer } from './VerbViewer';
import { VerbStudy } from './VerbStudy';
import { CardEditor } from './CardEditor';
import { TimeTraining } from './TimeTraining';
import { UserLoadError } from './UserLoadError';
import { UserMenu } from './navigation/UserMenu';
import { EditModeSelector } from './navigation/EditModeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useVerbs } from '@/hooks/useVerbs';

import {
  getSubtitleText,
  STUDY_SCREENS,
  type StudyScreen,
  type ViewMode,
  type MainViewMode,
  type StudyMode,
  type VerbMode,
  type WordsMode,
} from '@/utils/navigationUtils';

export function AuthenticatedApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('study');
  const [studyMode, setStudyMode] = useState<StudyMode>('cards');
  const [verbMode, setVerbMode] = useState<VerbMode>('view');
  const [isStudyDialogOpen, setIsStudyDialogOpen] = useState(false);
  const [wordsMode, setWordsMode] = useState<WordsMode>('cards');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkVerbImportOpen, setIsBulkVerbImportOpen] = useState(false);
  const [isBulkNounImportOpen, setIsBulkNounImportOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isCardImportSubmenuOpen, setIsCardImportSubmenuOpen] = useState(false);

  // Используем новые хуки
  const {
    user,
    profile,
    isUserAdmin,
    loading,
    error,
    setError,
    handleSignOut,
    reload,
  } = useAuth();
  const {
    cards,
    availableTags,
    loadCards,
    loadTags,
    handleAddCard,
    handleUpdateCard,
    handleDeleteCard,
    handleBulkImport,
  } = useCards();
  const { verbs, loadVerbs, handleBulkVerbImport } = useVerbs();

  const handleStudyClick = () => {
    setIsStudyDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleStudyScreenSelect = (screen: StudyScreen) => {
    const next = STUDY_SCREENS[screen];
    setMainViewMode('study');
    setViewMode('viewer');
    setStudyMode(next.studyMode);
    setWordsMode(next.wordsMode);
    setVerbMode(next.verbMode);

    if (screen === 'verbs-view') {
      void loadVerbs();
    }
  };

  const handleEditModeSelect = (mode: 'cards' | 'verbs') => {
    setMainViewMode('edit');
    setIsEditDialogOpen(false);

    if (mode === 'cards') {
      setViewMode('editor');
      void loadCards();
    } else if (mode === 'verbs') {
      setViewMode('verbs');
      void loadVerbs();
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !profile) {
    return (
      <UserLoadError error={error} onRetry={reload} onSignOut={handleSignOut} />
    );
  }

  const subtitleText = getSubtitleText({
    viewMode,
    mainViewMode,
    studyMode,
    verbMode,
    wordsMode,
  });

  const renderCardsViewer = () => (
    <App
      showNavigation={false}
      onCardsCountChange={() => {
        // cardsCount уже управляется в useCards
      }}
      initialViewMode="viewer"
      onViewModeChange={(mode) => {
        setViewMode(mode);
      }}
    />
  );

  const verbStudyContent: Record<VerbMode, () => ReactNode> = {
    training: () => <VerbTraining />,
    study: () => <VerbStudy />,
    view: () => (
      <VerbViewer
        verbs={verbs}
        onAddVerb={() => {
          handleEditModeSelect('verbs');
        }}
      />
    ),
  };

  const studyContent: Record<StudyMode, () => ReactNode> = {
    verbs: () => verbStudyContent[verbMode](),
    time: () => <TimeTraining />,
    cards: () =>
      wordsMode === 'articles' ? <ArticlesTrainer /> : renderCardsViewer(),
  };

  const editContent: Partial<Record<ViewMode, () => ReactNode>> = {
    verbs: () => <VerbEditor />,
    editor: () => (
      <CardEditor
        cards={cards}
        onAddCard={(cardData) => {
          void handleAddCard(cardData);
        }}
        onUpdateCard={(id, cardData) => {
          void handleUpdateCard(id, cardData);
        }}
        onDeleteCard={(id) => {
          void handleDeleteCard(id);
        }}
      />
    ),
  };

  const mainContent: Record<MainViewMode, () => ReactNode> = {
    study: () => studyContent[studyMode](),
    edit: () => (editContent[viewMode] ?? renderCardsViewer)(),
  };

  const isInvites = viewMode === 'invites';

  return (
    <AppShell
      subtitle={subtitleText}
      headerStart={
        <Collapse
          in={isInvites}
          orientation="horizontal"
          timeout={250}
          unmountOnExit
        >
          <IconButton
            color="inherit"
            disabled={!isInvites}
            onClick={() => {
              setViewMode('viewer');
            }}
            sx={{
              mr: 1,
              pointerEvents: isInvites ? 'auto' : 'none',
            }}
          >
            <ArrowBack />
          </IconButton>
        </Collapse>
      }
      headerEnd={
        <UserMenu
          profile={profile}
          isUserAdmin={isUserAdmin}
          onSignOut={handleSignOut}
          onInvitesClick={() => {
            setViewMode('invites');
          }}
        />
      }
      navigationValue={
        mainViewMode === 'edit' && viewMode === 'viewer'
          ? 'study'
          : mainViewMode
      }
      onStudyClick={handleStudyClick}
      onEditClick={handleEditClick}
      showNavigation={!isInvites}
      bottomSpacing={isUserAdmin ? 14 : 8}
    >
      {/* Меню «Изучение»: карточки, артикли, три режима глаголов, время */}
      <StudyNavigation
        open={isStudyDialogOpen}
        onClose={() => {
          setIsStudyDialogOpen(false);
        }}
        onSelect={handleStudyScreenSelect}
      />

      {/* Диалог выбора режима редактирования */}
      <EditModeSelector
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
        }}
        onModeSelect={handleEditModeSelect}
        onTagManagerOpen={() => {
          setIsTagManagerOpen(true);
        }}
        onImportMenuOpen={() => {
          setIsImportMenuOpen(true);
        }}
      />

      {/* Диалог меню импорта */}
      <ModeSelectSheet
        open={isImportMenuOpen}
        onClose={() => {
          setIsImportMenuOpen(false);
        }}
        title="Импорт"
        items={[
          {
            icon: <Upload />,
            primary: 'Импорт карточек',
            secondary: 'Массовый импорт карточек',
            onClick: () => {
              setIsImportMenuOpen(false);
              setIsCardImportSubmenuOpen(true);
            },
          },
          {
            icon: <Upload />,
            primary: 'Импорт глаголов',
            secondary: 'Массовый импорт глаголов с спряжениями',
            onClick: () => {
              setIsImportMenuOpen(false);
              setIsBulkVerbImportOpen(true);
            },
          },
        ]}
      />

      {/* Диалог подменю импорта карточек */}
      <ModeSelectSheet
        open={isCardImportSubmenuOpen}
        onClose={() => {
          setIsCardImportSubmenuOpen(false);
        }}
        title="Импорт карточек"
        items={[
          {
            icon: <Upload />,
            primary: 'Обычные карточки',
            secondary: 'Массовый импорт обычных карточек из текста',
            onClick: () => {
              setIsCardImportSubmenuOpen(false);
              setIsBulkImportOpen(true);
            },
          },
          {
            icon: <Upload />,
            primary: 'Существительные',
            secondary:
              'Массовый импорт существительных с артиклями и множественным числом',
            onClick: () => {
              setIsCardImportSubmenuOpen(false);
              setIsBulkNounImportOpen(true);
            },
          },
        ]}
      />

      {/* Диалог управления тегами */}
      <TagManager
        open={isTagManagerOpen}
        onClose={() => {
          setIsTagManagerOpen(false);
        }}
        onTagsUpdate={async () => {
          // Обновляем теги при изменении в менеджере
          await loadTags(true);
        }}
      />

      {/* Диалог массового импорта карточек */}
      <BulkImport
        open={isBulkImportOpen}
        onClose={() => {
          setIsBulkImportOpen(false);
        }}
        onImport={async (cards) => {
          try {
            setError(null);
            await handleBulkImport(cards);
            setIsBulkImportOpen(false);
          } catch (error) {
            console.error('Error importing cards:', error);
            setError('Ошибка импорта карточек');
          }
        }}
        availableTags={availableTags}
      />

      {/* Диалог массового импорта глаголов */}
      <BulkVerbImport
        open={isBulkVerbImportOpen}
        onClose={() => {
          setIsBulkVerbImportOpen(false);
        }}
        onImport={async (verbs) => {
          await handleBulkVerbImport(verbs);
        }}
      />

      {/* Диалог массового импорта существительных */}
      <BulkNounImport
        open={isBulkNounImportOpen}
        onClose={() => {
          setIsBulkNounImportOpen(false);
        }}
        onImport={async (cards) => {
          try {
            setError(null);
            await handleBulkImport(cards);
            setIsBulkNounImportOpen(false);
          } catch (error) {
            console.error('Error importing noun cards:', error);
            setError('Ошибка импорта существительных');
          }
        }}
        availableTags={availableTags}
      />

      {error && (
        <CenteredColumn sx={{ pt: 2, px: 2 }}>
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => {
              setError(null);
            }}
          >
            {error}
          </Alert>
        </CenteredColumn>
      )}

      <CenteredColumn sx={{ py: 2, px: 2 }}>
        {isInvites ? (
          <InviteManager userId={user.id} />
        ) : (
          mainContent[mainViewMode]()
        )}
      </CenteredColumn>
    </AppShell>
  );
}
