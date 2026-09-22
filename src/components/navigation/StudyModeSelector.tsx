'use client';

import { LocalOffer, Translate, Schedule } from '@mui/icons-material';
import { ModeSelectSheet } from './ModeSelectSheet';

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
  return (
    <ModeSelectSheet
      open={open}
      onClose={onClose}
      title="Выберите режим изучения"
      items={[
        {
          icon: <LocalOffer />,
          primary: 'Слова',
          secondary: 'Изучение слов и артиклей',
          onClick: () => {
            onModeSelect('cards');
          },
        },
        {
          icon: <Translate />,
          primary: 'Глаголы',
          secondary: 'Изучение спряжений немецких глаголов',
          onClick: () => {
            onModeSelect('verbs');
          },
        },
        {
          icon: <Schedule />,
          primary: 'Время',
          secondary: 'Изучение времени на немецком языке',
          onClick: () => {
            onModeSelect('time');
          },
        },
      ]}
    />
  );
}
