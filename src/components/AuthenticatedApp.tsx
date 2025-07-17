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
} from '@mui/material';
import { PersonAdd, ExitToApp, ArrowBack } from '@mui/icons-material';
import { App } from './App';
import { InviteManager } from './auth/InviteManager';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

type ViewMode = 'viewer' | 'editor' | 'invites';

export function AuthenticatedApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [cardsCount, setCardsCount] = useState(0);
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
            {viewMode === 'invites' ? 'Приглашения' : 'German Word Cards'}
          </Typography>
          {(viewMode === 'viewer' || viewMode === 'editor') &&
            cardsCount > 0 && (
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

      {/* Основной контент */}
      <Box sx={{ flexGrow: 1, pb: userIsAdmin ? 14 : 8 }}>
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

        {viewMode !== 'invites' ? (
          <App
            showNavigation={true}
            onCardsCountChange={setCardsCount}
            initialViewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
            }}
          />
        ) : (
          <Container maxWidth="lg" sx={{ py: 2 }}>
            <InviteManager userId={user.id} />
          </Container>
        )}
      </Box>
    </Box>
  );
}
