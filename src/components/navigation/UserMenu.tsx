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
} from '@mui/material';
import { PersonAdd, ExitToApp } from '@mui/icons-material';
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
