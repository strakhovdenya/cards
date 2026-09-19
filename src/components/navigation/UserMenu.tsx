'use client';

import { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import { PersonAdd, ExitToApp, KeyboardArrowDown } from '@mui/icons-material';
import type { Profile } from '@/types';

interface UserMenuProps {
  profile: Profile;
  userIsAdmin: boolean;
  onSignOut: () => void;
  onInvitesClick: () => void;
}

export function UserMenu({
  profile,
  userIsAdmin,
  onSignOut,
  onInvitesClick,
}: UserMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleInvitesClick = () => {
    onInvitesClick();
    handleMenuClose();
  };

  const handleSignOutClick = () => {
    onSignOut();
    handleMenuClose();
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="body2"
          color="inherit"
          noWrap
          sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 120 }}
        >
          {profile.first_name} {profile.last_name}
        </Typography>
        {userIsAdmin && (
          <Chip
            label="Админ"
            size="small"
            color="secondary"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 500,
            }}
          />
        )}
        <IconButton
          color="inherit"
          onClick={handleMenuOpen}
          sx={{ p: 0.5, minHeight: 44, minWidth: 44 }}
          aria-label="Открыть меню пользователя"
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
            {getInitials(profile.first_name, profile.last_name)}
          </Avatar>
          <KeyboardArrowDown
            aria-hidden="true"
            sx={{
              fontSize: 18,
              ml: 0.25,
              transition: 'transform 0.2s ease',
              transform: anchorEl ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </IconButton>
      </Box>

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2">
                {profile.first_name} {profile.last_name}
              </Typography>
              {userIsAdmin && (
                <Chip
                  label="Админ"
                  size="small"
                  color="secondary"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {profile.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        {userIsAdmin && (
          <MenuItem onClick={handleInvitesClick}>
            <PersonAdd sx={{ mr: 2 }} />
            Приглашения
          </MenuItem>
        )}
        <MenuItem onClick={handleSignOutClick}>
          <ExitToApp sx={{ mr: 2 }} />
          Выйти
        </MenuItem>
      </Menu>
    </>
  );
}
