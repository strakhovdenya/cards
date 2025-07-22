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
} from '@mui/material';
import {
  LocalOffer,
  Translate,
  Schedule,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { DevelopmentWarning } from '../DevelopmentWarning';

interface StudyModeSelectorProps {
  open: boolean;
  onClose: () => void;
  onModeSelect: (mode: 'cards' | 'verbs' | 'time') => void;
}

export function StudyModeSelector({
  open,
  onClose,
  onModeSelect,
}: StudyModeSelectorProps) {
  const handleModeSelect = (mode: 'cards' | 'verbs' | 'time') => {
    onModeSelect(mode);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Выберите режим изучения</DialogTitle>
      <DialogContent>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleModeSelect('cards');
              }}
            >
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
            <ListItemButton
              onClick={() => {
                handleModeSelect('verbs');
              }}
            >
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
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleModeSelect('time');
              }}
            >
              <ListItemIcon>
                <Schedule />
              </ListItemIcon>
              <ListItemText
                primary="Время"
                secondary="Изучение времени на немецком языке"
              />
            </ListItemButton>
          </ListItem>
          <DevelopmentWarning />
        </List>
      </DialogContent>
    </Dialog>
  );
}
