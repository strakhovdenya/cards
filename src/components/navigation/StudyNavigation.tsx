'use client';

import { useState } from 'react';
import { Style, School, Book } from '@mui/icons-material';
import { ModeSelectSheet } from './ModeSelectSheet';
import { StudyModeSelector } from './StudyModeSelector';
import type { StudyScreen } from '@/utils/navigationUtils';

type Submenu = 'words' | 'verbs' | null;

interface StudyNavigationProps {
  open: boolean;
  onClose: () => void;
  onSelect: (screen: StudyScreen) => void;
}

// Меню «Изучение»: какой экран открыт и что делать с выбором, решает контейнер
export function StudyNavigation({
  open,
  onClose,
  onSelect,
}: StudyNavigationProps) {
  const [submenu, setSubmenu] = useState<Submenu>(null);

  const closeSubmenu = () => {
    setSubmenu(null);
  };

  const select = (screen: StudyScreen) => {
    setSubmenu(null);
    onSelect(screen);
  };

  const handleModeSelect = (mode: 'cards' | 'verbs' | 'time') => {
    onClose();
    if (mode === 'time') {
      onSelect('time');
      return;
    }
    setSubmenu(mode === 'cards' ? 'words' : 'verbs');
  };

  return (
    <>
      <StudyModeSelector
        open={open}
        onClose={onClose}
        onModeSelect={handleModeSelect}
      />

      <ModeSelectSheet
        open={submenu === 'words'}
        onClose={closeSubmenu}
        title="Слова"
        items={[
          {
            icon: <Style />,
            primary: 'Карточки',
            secondary: 'Изучение немецких слов с помощью карточек',
            onClick: () => {
              select('cards');
            },
          },
          {
            icon: <Book />,
            primary: 'Артикли',
            secondary: 'Изучение артиклей (в разработке)',
            onClick: () => {
              select('articles');
            },
          },
        ]}
      />

      <ModeSelectSheet
        open={submenu === 'verbs'}
        onClose={closeSubmenu}
        title="Выберите режим глаголов"
        items={[
          {
            icon: <Style />,
            primary: 'Просмотр',
            secondary: 'Просмотр всех глаголов и их спряжений',
            onClick: () => {
              select('verbs-view');
            },
          },
          {
            icon: <School />,
            primary: 'Тренировка',
            secondary: 'Интерактивная тренировка спряжений',
            onClick: () => {
              select('verbs-training');
            },
          },
          {
            icon: <Book />,
            primary: 'Изучение',
            secondary: 'Изучение инфинитивов глаголов и их переводов',
            onClick: () => {
              select('verbs-study');
            },
          },
        ]}
      />
    </>
  );
}
