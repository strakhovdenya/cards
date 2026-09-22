'use client';

import { LocalOffer, Translate, Upload } from '@mui/icons-material';
import { ModeSelectSheet } from './ModeSelectSheet';

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
  return (
    <ModeSelectSheet
      open={open}
      onClose={onClose}
      title="Выберите режим редактирования"
      items={[
        {
          icon: <LocalOffer />,
          primary: 'Карточки',
          secondary: 'Редактирование немецких слов',
          onClick: () => {
            onModeSelect('cards');
          },
        },
        {
          icon: <Translate />,
          primary: 'Глаголы',
          secondary: 'Редактирование спряжений немецких глаголов',
          onClick: () => {
            onModeSelect('verbs');
          },
        },
        {
          icon: <LocalOffer />,
          primary: 'Управление тегами',
          secondary: 'Создание и редактирование тегов',
          onClick: onTagManagerOpen,
        },
        {
          icon: <Upload />,
          primary: 'Импорт карточек',
          secondary: 'Массовый импорт карточек',
          onClick: onImportMenuOpen,
        },
      ]}
    />
  );
}
