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
  Upload,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { DevelopmentWarning } from '../DevelopmentWarning';

interface EditModeSelectorProps {
  open: boolean;
  onClose: () => void;
  onModeSelect: (mode: 'cards' | 'verbs') => void;
  onTagManagerOpen: () => void;
  onImportMenuOpen: () => void;
}

export function EditModeSelector({
  open,
  onClose,
  onModeSelect,
  onTagManagerOpen,
  onImportMenuOpen,
}: EditModeSelectorProps) {
  const handleModeSelect = (mode: 'cards' | 'verbs') => {
    onModeSelect(mode);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Выберите режим редактирования</DialogTitle>
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
                secondary="Редактирование немецких слов"
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
                secondary="Редактирование спряжений немецких глаголов"
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={onTagManagerOpen}>
              <ListItemIcon>
                <LocalOffer />
              </ListItemIcon>
              <ListItemText
                primary="Управление тегами"
                secondary="Создание и редактирование тегов"
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={onImportMenuOpen}>
              <ListItemIcon>
                <Upload />
              </ListItemIcon>
              <ListItemText
                primary="Импорт карточек"
                secondary="Массовый импорт карточек"
              />
              <KeyboardArrowRight />
            </ListItemButton>
          </ListItem>
          <DevelopmentWarning />
        </List>
      </DialogContent>
    </Dialog>
  );
}
