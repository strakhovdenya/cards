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
} from '@mui/material';
import { PersonAdd, ExitToApp, ArrowBack, School, Style, Translate, Edit, School as SchoolIcon, KeyboardArrowDown, KeyboardArrowRight, LocalOffer } from '@mui/icons-material';
import { App } from './App';
import { InviteManager } from './auth/InviteManager';
import { VerbTraining } from './VerbTraining';
import { VerbManager } from './VerbManager';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

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

  const handleStudyModeSelect = (mode: 'cards' | 'verbs') => {
    setStudyMode(mode);
    setIsStudyDialogOpen(false);
    
    if (mode === 'verbs') {
      setVerbMode('view');
    }
  };

  const handleVerbModeSelect = (mode: 'view' | 'training') => {
    setVerbMode(mode);
    setIsVerbModeDialogOpen(false);
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
               'German Word Cards') : 'Редактирование'}
          </Typography>
          {mainViewMode === 'study' && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              {studyMode === 'cards' ? 'Карточки' : 
               verbMode === 'training' ? 'Тренировка' : 'Просмотр'}
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
            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.contrastText">
                ⚠️ Глаголы работают, но функционал еще в разработке
              </Typography>
            </Box>
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
                <VerbManager />
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
              label="Редактирование"
              value="edit"
              icon={<Edit />}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
