/* eslint-disable @typescript-eslint/no-misused-promises */
'use client';

import { useState } from 'react';
import { SwitchTransition } from 'react-transition-group';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  DialogActions,
  Fade,
  Collapse,
} from '@mui/material';
import { CenteredColumn } from './layout/CenteredColumn';
import {
  ArrowBack,
  AutoStories,
  School,
  Style,
  Edit,
  School as SchoolIcon,
  KeyboardArrowDown,
  Upload,
  Book,
} from '@mui/icons-material';
import { ModeSelectSheet } from './navigation/ModeSelectSheet';
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
import { UserMenu } from './navigation/UserMenu';
import { StudyModeSelector } from './navigation/StudyModeSelector';
import { EditModeSelector } from './navigation/EditModeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useVerbs } from '@/hooks/useVerbs';

type ViewMode = 'viewer' | 'editor' | 'invites' | 'verbs';
type MainViewMode = 'study' | 'edit';
type StudyMode = 'cards' | 'verbs' | 'time';
type VerbMode = 'view' | 'training' | 'study';

export function AuthenticatedApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('study');
  const [studyMode, setStudyMode] = useState<StudyMode>('cards');
  const [verbMode, setVerbMode] = useState<VerbMode>('view');
  const [isStudyDialogOpen, setIsStudyDialogOpen] = useState(false);
  const [isVerbModeDialogOpen, setIsVerbModeDialogOpen] = useState(false);
  const [isWordsSubmenuOpen, setIsWordsSubmenuOpen] = useState(false);
  const [wordsMode, setWordsMode] = useState<'cards' | 'articles'>('cards');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVerbEditDialogOpen, setIsVerbEditDialogOpen] = useState(false);
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
    userIsAdmin,
    loading,
    error,
    setError,
    handleSignOut,
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
  const {
    verbs,
    editingVerb,
    verbFormData,
    loadVerbs,
    handleVerbUpdate,
    handleAddVerb,
    handleEditVerb,
    handleVerbFormChange,
    handleConjugationChange,
    handleVerbSubmit,
    handleVerbDelete,
    handleBulkVerbImport,
  } = useVerbs();

  const handleStudyClick = () => {
    setIsStudyDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleStudyModeSelect = (mode: 'cards' | 'verbs' | 'time') => {
    setMainViewMode('study');
    setStudyMode(mode);
    setIsStudyDialogOpen(false);

    if (mode === 'cards') {
      // Открываем подменю "Слова"
      setIsWordsSubmenuOpen(true);
    } else if (mode === 'verbs') {
      setIsVerbModeDialogOpen(true);
    } else if (mode === 'time') {
      setViewMode('viewer');
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

  const handleVerbModeSelect = (mode: 'view' | 'training' | 'study') => {
    setVerbMode(mode);
    setMainViewMode('study');
    setStudyMode('verbs');
    setIsVerbModeDialogOpen(false);

    if (mode === 'view') {
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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography>Ошибка загрузки данных пользователя</Typography>
      </Box>
    );
  }

  const titleText = 'German Word Cards';

  const subtitleText =
    viewMode === 'invites'
      ? 'Приглашения'
      : mainViewMode === 'study'
        ? studyMode === 'verbs'
          ? 'Глаголы'
          : studyMode === 'time'
            ? 'Времена'
            : wordsMode === 'articles'
              ? 'Артикли'
              : 'Существительные'
        : mainViewMode === 'edit'
          ? viewMode === 'verbs'
            ? 'Глаголы'
            : viewMode === 'editor'
              ? 'Существительные'
              : null
          : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Заголовок с меню пользователя */}
      <AppBar
        position="static"
        elevation={0}
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        })}
      >
        <Toolbar disableGutters sx={{ px: 2, py: 1 }}>
          <CenteredColumn
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              gap: 1.5,
            }}
          >
            <Collapse
              in={viewMode === 'invites'}
              orientation="horizontal"
              timeout={250}
              unmountOnExit
            >
              <IconButton
                color="inherit"
                disabled={viewMode !== 'invites'}
                onClick={() => {
                  setViewMode('viewer');
                }}
                sx={{
                  mr: 1,
                  pointerEvents: viewMode === 'invites' ? 'auto' : 'none',
                }}
              >
                <ArrowBack />
              </IconButton>
            </Collapse>
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoStories fontSize="small" />
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <SwitchTransition mode="out-in">
                <Fade key={subtitleText} timeout={200}>
                  <Box>
                    <Typography
                      variant="h6"
                      component="div"
                      noWrap
                      sx={{ fontWeight: 700, lineHeight: 1.25 }}
                    >
                      {titleText}
                    </Typography>
                    {subtitleText && (
                      <Typography
                        variant="caption"
                        component="div"
                        noWrap
                        sx={{ opacity: 0.85, lineHeight: 1.25 }}
                      >
                        {subtitleText}
                      </Typography>
                    )}
                  </Box>
                </Fade>
              </SwitchTransition>
            </Box>

            {/* Информация о пользователе */}
            <UserMenu
              profile={profile}
              userIsAdmin={userIsAdmin}
              onSignOut={handleSignOut}
              onInvitesClick={() => {
                setViewMode('invites');
              }}
            />
          </CenteredColumn>
        </Toolbar>
      </AppBar>

      {/* Диалог выбора режима изучения */}
      <StudyModeSelector
        open={isStudyDialogOpen}
        onClose={() => {
          setIsStudyDialogOpen(false);
        }}
        onModeSelect={handleStudyModeSelect}
      />

      {/* Диалог подменю "Слова" */}
      <ModeSelectSheet
        open={isWordsSubmenuOpen}
        onClose={() => {
          setIsWordsSubmenuOpen(false);
        }}
        title="Слова"
        items={[
          {
            icon: <Style />,
            primary: 'Карточки',
            secondary: 'Изучение немецких слов с помощью карточек',
            onClick: () => {
              setIsWordsSubmenuOpen(false);
              setWordsMode('cards');
              setViewMode('viewer');
            },
          },
          {
            icon: <Book />,
            primary: 'Артикли',
            secondary: 'Изучение артиклей (в разработке)',
            onClick: () => {
              setIsWordsSubmenuOpen(false);
              setWordsMode('articles');
              setViewMode('viewer');
            },
          },
        ]}
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

      {/* Диалог выбора режима глаголов */}
      <ModeSelectSheet
        open={isVerbModeDialogOpen}
        onClose={() => {
          setIsVerbModeDialogOpen(false);
        }}
        title="Выберите режим глаголов"
        items={[
          {
            icon: <Style />,
            primary: 'Просмотр',
            secondary: 'Просмотр всех глаголов и их спряжений',
            onClick: () => {
              handleVerbModeSelect('view');
            },
          },
          {
            icon: <School />,
            primary: 'Тренировка',
            secondary: 'Интерактивная тренировка спряжений',
            onClick: () => {
              handleVerbModeSelect('training');
            },
          },
          {
            icon: <Book />,
            primary: 'Изучение',
            secondary: 'Изучение инфинитивов глаголов и их переводов',
            onClick: () => {
              handleVerbModeSelect('study');
            },
          },
        ]}
      />

      {/* Диалог редактирования глаголов */}
      <Dialog
        open={isVerbEditDialogOpen}
        onClose={() => {
          setIsVerbEditDialogOpen(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingVerb ? 'Редактировать глагол' : 'Добавить глагол'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Инфинитив"
              value={verbFormData.infinitive}
              onChange={(e) => {
                handleVerbFormChange('infinitive', e.target.value);
              }}
              fullWidth
            />
            <TextField
              label="Перевод"
              value={verbFormData.translation}
              onChange={(e) => {
                handleVerbFormChange('translation', e.target.value);
              }}
              fullWidth
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
              Спряжения
            </Typography>

            {verbFormData.conjugations.map((conjugation, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                <Typography variant="subtitle2" color="primary">
                  {conjugation.person}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Форма"
                    value={conjugation.form}
                    onChange={(e) => {
                      handleConjugationChange(index, 'form', e.target.value);
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Перевод"
                    value={conjugation.translation}
                    onChange={(e) => {
                      handleConjugationChange(
                        index,
                        'translation',
                        e.target.value
                      );
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsVerbEditDialogOpen(false);
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={() => {
              void handleVerbSubmit();
            }}
            variant="contained"
          >
            {editingVerb ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Основной контент */}
      <Box
        sx={{
          flexGrow: 1,
          pb: viewMode !== 'invites' ? 8 : userIsAdmin ? 14 : 8,
        }}
      >
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

        {viewMode === 'invites' ? (
          <CenteredColumn sx={{ py: 2, px: 2 }}>
            <InviteManager userId={user.id} />
          </CenteredColumn>
        ) : mainViewMode === 'study' ? (
          <CenteredColumn sx={{ py: 2, px: 2 }}>
            {/* Контент в зависимости от выбранного режима */}
            {studyMode === 'verbs' ? (
              verbMode === 'training' ? (
                <VerbTraining />
              ) : verbMode === 'study' ? (
                <VerbStudy />
              ) : (
                <VerbViewer
                  verbs={verbs}
                  onVerbUpdate={handleVerbUpdate}
                  onVerbDelete={handleVerbDelete}
                  onAddVerb={handleAddVerb}
                  onEditVerb={handleEditVerb}
                />
              )
            ) : studyMode === 'time' ? (
              <TimeTraining />
            ) : wordsMode === 'articles' ? (
              <ArticlesTrainer />
            ) : (
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
            )}
          </CenteredColumn>
        ) : mainViewMode === 'edit' ? (
          <CenteredColumn sx={{ py: 2, px: 2 }}>
            {viewMode === 'verbs' ? (
              <VerbEditor />
            ) : viewMode === 'editor' ? (
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
            ) : (
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
            )}
          </CenteredColumn>
        ) : (
          <App
            showNavigation={true}
            onCardsCountChange={() => {
              // cardsCount уже управляется в useCards
            }}
            initialViewMode="editor"
            onViewModeChange={(mode) => {
              setViewMode(mode);
            }}
          />
        )}
      </Box>

      {/* Нижняя панель навигации */}
      {viewMode !== 'invites' && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTop: 1,
            borderColor: 'divider',
            boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
            pb: 'env(safe-area-inset-bottom)',
          }}
          elevation={0}
        >
          <CenteredColumn>
            <BottomNavigation
              value={
                mainViewMode === 'edit' && viewMode === 'viewer'
                  ? 'study'
                  : mainViewMode
              }
              onChange={(event, newValue) => {
                if (newValue === 'study') {
                  handleStudyClick();
                } else if (newValue === 'edit') {
                  handleEditClick();
                } else {
                  setMainViewMode(newValue as MainViewMode);
                }
              }}
              showLabels
            >
              <BottomNavigationAction
                label="Изучение"
                value="study"
                icon={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SchoolIcon />
                    <KeyboardArrowDown sx={{ fontSize: '0.8rem' }} />
                  </Box>
                }
              />
              <BottomNavigationAction
                label="Редактирование"
                value="edit"
                icon={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Edit />
                    <KeyboardArrowDown sx={{ fontSize: '0.8rem' }} />
                  </Box>
                }
              />
            </BottomNavigation>
          </CenteredColumn>
        </Paper>
      )}
    </Box>
  );
}
