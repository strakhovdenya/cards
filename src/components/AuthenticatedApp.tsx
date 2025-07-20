'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, isAdmin, type Profile } from '@/lib/auth';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
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
import { PersonAdd, ExitToApp, ArrowBack, School, Style, Translate, Edit, School as SchoolIcon, KeyboardArrowDown, KeyboardArrowRight, LocalOffer } from '@mui/icons-material';
import { App } from './App';
import { InviteManager } from './auth/InviteManager';
import { VerbTraining } from './VerbTraining';
import { VerbManager } from './VerbManager';
import { DevelopmentWarning } from './DevelopmentWarning';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { VerbViewer } from './VerbViewer';
import type { Verb } from '@/types';
import { getVerbs, createVerb, updateVerb, deleteVerb } from '@/services/verbService';

type ViewMode = 'viewer' | 'editor' | 'invites' | 'verbs';
type MainViewMode = 'study' | 'edit';
type StudyMode = 'cards' | 'verbs';
type VerbMode = 'view' | 'training';

export function AuthenticatedApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('study');
  const [studyMode, setStudyMode] = useState<StudyMode>('cards');
  const [verbMode, setVerbMode] = useState<VerbMode>('view');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [cardsCount, setCardsCount] = useState(0);
  const [isStudyDialogOpen, setIsStudyDialogOpen] = useState(false);
  const [isVerbModeDialogOpen, setIsVerbModeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVerbEditDialogOpen, setIsVerbEditDialogOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<Verb | null>(null);
  const [verbFormData, setVerbFormData] = useState({
    infinitive: '',
    translation: '',
    conjugations: [
      { person: 'ich', form: '', translation: '' },
      { person: 'du', form: '', translation: '' },
      { person: 'er/sie/es', form: '', translation: '' },
      { person: 'wir', form: '', translation: '' },
      { person: 'ihr', form: '', translation: '' },
      { person: 'sie / Sie', form: '', translation: '' },
    ],
  });
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const router = useRouter();

  const loadUserAndProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getCurrentUser();
      const currentUser = result.user;
      const currentProfile = result.profile;

      if (!currentUser) {
        router.push('/auth');
        return;
      }

      setUser(currentUser);
      setProfile(currentProfile);

      // Проверяем права админа
      if (currentProfile) {
        const adminStatus = await isAdmin(currentUser.id);
        setUserIsAdmin(adminStatus || currentProfile.role === 'admin');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError(
        err instanceof Error ? err.message : 'Ошибка загрузки пользователя'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Загрузка пользователя при инициализации
  useEffect(() => {
    void loadUserAndProfile();
  }, [loadUserAndProfile]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выхода');
    }
    handleMenuClose();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleStudyClick = () => {
    setIsStudyDialogOpen(true);
  };

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleStudyModeSelect = (mode: 'cards' | 'verbs') => {
    setStudyMode(mode);
    setIsStudyDialogOpen(false);
    
    if (mode === 'verbs') {
      setIsVerbModeDialogOpen(true);
    }
  };

  const handleEditModeSelect = (mode: 'cards' | 'verbs') => {
    setMainViewMode('edit');
    setIsEditDialogOpen(false);
    
    if (mode === 'cards') {
      setViewMode('editor');
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

  const loadVerbs = async () => {
    try {
      const fetchedVerbs = await getVerbs();
      setVerbs(fetchedVerbs);
    } catch (error) {
      console.error('Error loading verbs:', error);
      setError('Ошибка загрузки глаголов');
    }
  };

  const handleVerbUpdate = (updatedVerb: Verb) => {
    setVerbs(prev => prev.map(v => v.id === updatedVerb.id ? updatedVerb : v));
  };

  const handleAddVerb = () => {
    setEditingVerb(null);
    setVerbFormData({
      infinitive: '',
      translation: '',
      conjugations: [
        { person: 'ich', form: '', translation: '' },
        { person: 'du', form: '', translation: '' },
        { person: 'er/sie/es', form: '', translation: '' },
        { person: 'wir', form: '', translation: '' },
        { person: 'ihr', form: '', translation: '' },
        { person: 'sie / Sie', form: '', translation: '' },
      ],
    });
    setIsVerbEditDialogOpen(true);
  };

  const handleEditVerb = (verb: Verb) => {
    setEditingVerb(verb);
    setVerbFormData({
      infinitive: verb.infinitive,
      translation: verb.translation,
      conjugations: verb.conjugations || [
        { person: 'ich', form: '', translation: '' },
        { person: 'du', form: '', translation: '' },
        { person: 'er/sie/es', form: '', translation: '' },
        { person: 'wir', form: '', translation: '' },
        { person: 'ihr', form: '', translation: '' },
        { person: 'sie / Sie', form: '', translation: '' },
      ],
    });
    setIsVerbEditDialogOpen(true);
  };

  const handleVerbFormChange = (field: keyof typeof verbFormData, value: string) => {
    setVerbFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConjugationChange = (index: number, field: keyof typeof verbFormData.conjugations[0], value: string) => {
    setVerbFormData(prev => ({
      ...prev,
      conjugations: prev.conjugations.map((conj, i) =>
        i === index ? { ...conj, [field]: value } : conj
      ),
    }));
  };

  const handleVerbSubmit = async () => {
    if (!verbFormData.infinitive.trim() || !verbFormData.translation.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      setError(null);
      if (editingVerb) {
        const updatedVerb = await updateVerb(editingVerb.id, verbFormData);
        setVerbs(prev => prev.map(v => v.id === editingVerb.id ? updatedVerb : v));
      } else {
        const newVerb = await createVerb(verbFormData);
        setVerbs(prev => [newVerb, ...prev]);
      }
      setIsVerbEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving verb:', error);
      setError('Ошибка сохранения глагола');
    }
  };

  const handleVerbDelete = async (id: string) => {
    if (!window.confirm('Удалить этот глагол?')) return;

    try {
      await deleteVerb(id);
      setVerbs(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting verb:', error);
      setError('Ошибка удаления глагола');
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
            {viewMode === 'invites' ? 'Приглашения' : 
             mainViewMode === 'study' ? (studyMode === 'verbs' ? 
               (verbMode === 'training' ? 'Тренировка глаголов' : 'Изучение глаголов') : 
               'German Word Cards') : 
             mainViewMode === 'edit' ? (viewMode === 'verbs' ? 'Редактирование глаголов' : 'Редактирование') :
             'Редактирование'}
          </Typography>
          {mainViewMode === 'study' && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {studyMode === 'cards' ? 'Карточки' : 
               verbMode === 'training' ? 'Тренировка' : 'Просмотр'}
            </Typography>
          )}
          {mainViewMode === 'edit' && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {viewMode === 'verbs' ? 'Глаголы' : 'Карточки'}
            </Typography>
          )}
          {mainViewMode === 'study' && studyMode === 'cards' && cardsCount > 0 && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {cardsCount} карточек
            </Typography>
          )}

          {/* Информация о пользователе */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="inherit">
              {profile.first_name} {profile.last_name}
            </Typography>
            {userIsAdmin && (
              <Typography
                variant="caption"
                sx={{
                  bgcolor: 'secondary.main',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  color: 'secondary.contrastText',
                }}
              >
                Админ
              </Typography>
            )}
            <IconButton color="inherit" onClick={handleMenuOpen} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {getInitials(profile.first_name, profile.last_name)}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Меню пользователя */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem disabled>
          <Box>
            <Typography variant="subtitle2">
              {profile.first_name} {profile.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {profile.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        {userIsAdmin && (
          <MenuItem
            onClick={() => {
              setViewMode('invites');
              handleMenuClose();
            }}
          >
            <PersonAdd sx={{ mr: 2 }} />
            Приглашения
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            void handleSignOut();
          }}
        >
          <ExitToApp sx={{ mr: 2 }} />
          Выйти
        </MenuItem>
      </Menu>

      {/* Диалог выбора режима изучения */}
      <Dialog
        open={isStudyDialogOpen}
        onClose={() => setIsStudyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Выберите режим изучения</DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleStudyModeSelect('cards')}>
                <ListItemIcon>
                  <LocalOffer />
                </ListItemIcon>
                <ListItemText 
                  primary="Карточки" 
                  secondary="Изучение немецких слов с помощью карточек"
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleStudyModeSelect('verbs')}>
                <ListItemIcon>
                  <Translate />
                </ListItemIcon>
                <ListItemText 
                  primary="Глаголы" 
                  secondary="Изучение спряжений немецких глаголов"
                />
                <KeyboardArrowRight />
              </ListItemButton>
            </ListItem>
            <DevelopmentWarning />
          </List>
        </DialogContent>
      </Dialog>

      {/* Диалог выбора режима редактирования */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Выберите режим редактирования</DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleEditModeSelect('cards')}>
                <ListItemIcon>
                  <LocalOffer />
                </ListItemIcon>
                <ListItemText 
                  primary="Карточки" 
                  secondary="Редактирование немецких слов"
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleEditModeSelect('verbs')}>
                <ListItemIcon>
                  <Translate />
                </ListItemIcon>
                <ListItemText 
                  primary="Глаголы" 
                  secondary="Редактирование спряжений немецких глаголов"
                />
              </ListItemButton>
            </ListItem>
            <DevelopmentWarning />
          </List>
        </DialogContent>
      </Dialog>

      {/* Диалог выбора режима глаголов */}
      <Dialog
        open={isVerbModeDialogOpen}
        onClose={() => setIsVerbModeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Выберите режим глаголов</DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleVerbModeSelect('view')}>
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
              <ListItemButton onClick={() => handleVerbModeSelect('training')}>
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
        onClose={() => setIsVerbEditDialogOpen(false)}
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
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                      handleConjugationChange(index, 'translation', e.target.value);
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
          <Button onClick={() => setIsVerbEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={() => {
            void handleVerbSubmit();
          }} variant="contained">
            {editingVerb ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Основной контент */}
      <Box sx={{ flexGrow: 1, pb: viewMode !== 'invites' ? 8 : (userIsAdmin ? 14 : 8) }}>
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
            ) : (
              <App
                showNavigation={false}
                onCardsCountChange={setCardsCount}
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
              <VerbManager />
            ) : viewMode === 'editor' ? (
              <App
                showNavigation={false}
                onCardsCountChange={setCardsCount}
                initialViewMode="editor"
                onViewModeChange={(mode) => {
                  setViewMode(mode);
                }}
              />
            ) : (
              <App
                showNavigation={false}
                onCardsCountChange={setCardsCount}
                initialViewMode="editor"
                onViewModeChange={(mode) => {
                  setViewMode(mode);
                }}
              />
            )}
          </Container>
        ) : (
          <App
            showNavigation={true}
            onCardsCountChange={setCardsCount}
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
            borderColor: 'divider'
          }} 
          elevation={3}
        >
          <BottomNavigation
            value={mainViewMode}
            onChange={(event, newValue) => {
              if (newValue === 'study') {
                handleStudyClick();
              } else if (newValue === 'edit') {
                handleEditClick();
              } else {
                setMainViewMode(newValue);
              }
            }}
            showLabels
          >
            <BottomNavigationAction
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
