/* eslint-disable @typescript-eslint/no-misused-promises */
'use client';

import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Button,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  School,
  Style,
  Edit,
  School as SchoolIcon,
  KeyboardArrowDown,
  Upload,
} from '@mui/icons-material';
import { App } from './App';
import { InviteManager } from './auth/InviteManager';
import { VerbTraining } from './VerbTraining';
import { VerbEditor } from './VerbEditor';
import { TagManager } from './TagManager';
import { BulkImport } from './BulkImport';
import { BulkVerbImport } from './BulkVerbImport';
import { VerbViewer } from './VerbViewer';
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
type VerbMode = 'view' | 'training';

export function AuthenticatedApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('study');
  const [studyMode, setStudyMode] = useState<StudyMode>('cards');
  const [verbMode, setVerbMode] = useState<VerbMode>('view');
  const [isStudyDialogOpen, setIsStudyDialogOpen] = useState(false);
  const [isVerbModeDialogOpen, setIsVerbModeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVerbEditDialogOpen, setIsVerbEditDialogOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkVerbImportOpen, setIsBulkVerbImportOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);

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
    cardsCount,
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
    setStudyMode(mode);
    setIsStudyDialogOpen(false);

    if (mode === 'cards') {
      setViewMode('viewer');
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

  const handleVerbModeSelect = (mode: 'view' | 'training') => {
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
      <AppBar position="static" elevation={0}>
        <Toolbar>
          {viewMode === 'invites' && (
            <IconButton
              color="inherit"
              onClick={() => {
                setViewMode('viewer');
              }}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {viewMode === 'invites'
              ? 'Приглашения'
              : mainViewMode === 'study'
                ? studyMode === 'verbs'
                  ? verbMode === 'training'
                    ? 'Тренировка глаголов'
                    : 'Изучение глаголов'
                  : studyMode === 'time'
                    ? 'Изучение времени'
                    : 'German Word Cards'
                : mainViewMode === 'edit'
                  ? viewMode === 'verbs'
                    ? 'Редактирование глаголов'
                    : viewMode === 'editor'
                      ? 'Редактирование карточек'
                      : 'German Word Cards'
                  : 'German Word Cards'}
          </Typography>
          {mainViewMode === 'study' && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {studyMode === 'cards'
                ? 'Карточки'
                : studyMode === 'time'
                  ? 'Время'
                  : verbMode === 'training'
                    ? 'Тренировка'
                    : 'Просмотр'}
            </Typography>
          )}
          {mainViewMode === 'edit' && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {viewMode === 'verbs' ? 'Глаголы' : 'Карточки'}
            </Typography>
          )}
          {mainViewMode === 'study' &&
            studyMode === 'cards' &&
            cardsCount > 0 && (
              <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
                {cardsCount} карточек
              </Typography>
            )}

          {/* Информация о пользователе */}
          <UserMenu
            profile={profile}
            userIsAdmin={userIsAdmin}
            onSignOut={handleSignOut}
            onInvitesClick={() => {
              setViewMode('invites');
            }}
          />
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
      <Dialog
        open={isVerbModeDialogOpen}
        onClose={() => {
          setIsVerbModeDialogOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Выберите режим глаголов</DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  handleVerbModeSelect('view');
                }}
              >
                <ListItemIcon>
                  <Style />
                </ListItemIcon>
                <ListItemText
                  primary="Просмотр"
                  secondary="Просмотр всех глаголов и их спряжений"
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  handleVerbModeSelect('training');
                }}
              >
                <ListItemIcon>
                  <School />
                </ListItemIcon>
                <ListItemText
                  primary="Тренировка"
                  secondary="Интерактивная тренировка спряжений"
                />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>

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
      <Dialog
        open={isImportMenuOpen}
        onClose={() => {
          setIsImportMenuOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Импорт</DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  setIsImportMenuOpen(false);
                  setIsBulkImportOpen(true);
                }}
              >
                <ListItemIcon>
                  <Upload />
                </ListItemIcon>
                <ListItemText
                  primary="Импорт карточек"
                  secondary="Массовый импорт карточек из текста"
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  setIsImportMenuOpen(false);
                  setIsBulkVerbImportOpen(true);
                }}
              >
                <ListItemIcon>
                  <Upload />
                </ListItemIcon>
                <ListItemText
                  primary="Импорт глаголов"
                  secondary="Массовый импорт глаголов с спряжениями"
                />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>

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

      {/* Основной контент */}
      <Box
        sx={{
          flexGrow: 1,
          pb: viewMode !== 'invites' ? 8 : userIsAdmin ? 14 : 8,
        }}
      >
        {error && (
          <Container maxWidth="lg" sx={{ pt: 2 }}>
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => {
                setError(null);
              }}
            >
              {error}
            </Alert>
          </Container>
        )}

        {viewMode === 'invites' ? (
          <Container maxWidth="lg" sx={{ py: 2 }}>
            <InviteManager userId={user.id} />
          </Container>
        ) : mainViewMode === 'study' ? (
          <Container maxWidth="lg" sx={{ py: 2 }}>
            {/* Контент в зависимости от выбранного режима */}
            {studyMode === 'verbs' ? (
              verbMode === 'training' ? (
                <VerbTraining />
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
          </Container>
        ) : mainViewMode === 'edit' ? (
          <Container maxWidth="lg" sx={{ py: 2 }}>
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
          </Container>
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
          }}
          elevation={3}
        >
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
              label={
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SchoolIcon />
                    <KeyboardArrowDown sx={{ fontSize: '0.8rem' }} />
                  </Box>
                  <Typography variant="caption">Изучение</Typography>
                </Box>
              }
              value="study"
              icon={<></>}
            />
            <BottomNavigationAction
              label={
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Edit />
                    <KeyboardArrowDown sx={{ fontSize: '0.8rem' }} />
                  </Box>
                  <Typography variant="caption">Редактирование</Typography>
                </Box>
              }
              value="edit"
              icon={<></>}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
