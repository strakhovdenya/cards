'use client';

import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import { School, Edit } from '@mui/icons-material';
import { CardViewer } from './CardViewer';
import { CardEditor } from './CardEditor';
import { Card as CardType, CardFormData, ViewMode } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { sampleCards } from '@/data/sampleCards';

export function App() {
  const [cards, setCards] = useLocalStorage<CardType[]>(
    'german-cards',
    sampleCards
  );
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');

  const generateId = () =>
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleAddCard = (cardData: CardFormData) => {
    const newCard: CardType = {
      id: generateId(),
      germanWord: cardData.germanWord.trim(),
      translation: cardData.translation.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCards((prev) => [...prev, newCard]);
  };

  const handleUpdateCard = (id: string, cardData: CardFormData) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id
          ? {
              ...card,
              germanWord: cardData.germanWord.trim(),
              translation: cardData.translation.trim(),
              updatedAt: new Date(),
            }
          : card
      )
    );
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Заголовок */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            German Word Cards
          </Typography>
          <Typography variant="body2" color="inherit">
            {cards.length} карточек
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Основной контент */}
      <Box sx={{ flexGrow: 1, pb: 7 }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {viewMode === 'viewer' ? (
            <CardViewer cards={cards} />
          ) : (
            <CardEditor
              cards={cards}
              onAddCard={handleAddCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
            />
          )}
        </Container>
      </Box>

      {/* Нижняя навигация */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
        elevation={3}
      >
        <BottomNavigation
          value={viewMode}
          onChange={(event, newValue) => handleViewModeChange(newValue)}
          sx={{
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              px: 3,
            },
          }}
        >
          <BottomNavigationAction
            label="Изучение"
            value="viewer"
            icon={<School />}
          />
          <BottomNavigationAction
            label="Редактор"
            value="editor"
            icon={<Edit />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
