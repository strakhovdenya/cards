'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Slide,
  useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { KeyboardArrowRight } from '@mui/icons-material';
import type { ReactNode } from 'react';

export interface ModeSelectItem {
  icon: ReactNode;
  primary: string;
  secondary: string;
  onClick: () => void;
}

interface ModeSelectSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: ModeSelectItem[];
}

export function ModeSelectSheet({
  open,
  onClose,
  title,
  items,
}: ModeSelectSheetProps) {
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)'
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      slots={{ transition: Slide }}
      slotProps={{
        transition: {
          direction: 'up',
          timeout: prefersReducedMotion ? 0 : undefined,
        } as never,
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
        },
        '& .MuiDialog-paper': {
          position: 'relative',
          m: 0,
          width: '100%',
          maxHeight: '80vh',
          borderRadius: '16px 16px 0 0',
          pb: 'env(safe-area-inset-bottom)',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 4,
          borderRadius: 2,
          bgcolor: 'action.disabled',
          mx: 'auto',
          mt: 1.5,
        }}
      />
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <List disablePadding>
          {items.map((item) => (
            <ListItem key={item.primary} disablePadding>
              <ListItemButton onClick={item.onClick} sx={{ minHeight: 56 }}>
                <ListItemIcon>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                    }}
                  >
                    {item.icon}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={item.primary}
                  secondary={item.secondary}
                />
                <KeyboardArrowRight sx={{ color: 'action.active' }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
