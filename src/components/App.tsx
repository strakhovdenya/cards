'use client';

import { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { School, Edit } from '@mui/icons-material';
import { CardViewer } from './CardViewer';
import { CardEditor } from './CardEditor';
import { Card as CardType, CardFormData, ViewMode } from '@/types';
import { ClientCardService } from '@/services/cardService';
import { migrateSampleData } from '@/utils/migrateData';

export function App() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка карточек при инициализации
  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Пытаемся загрузить карточки
      const fetchedCards = await ClientCardService.getCards();

      // Если карточек нет, запускаем миграцию
      if (fetchedCards.length === 0) {
        console.log('Карточки не найдены, запускаю миграцию данных...');
        await migrateSampleData();
        const migratedCards = await ClientCardService.getCards();
        setCards(migratedCards);
      } else {
        setCards(fetchedCards);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки карточек');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (cardData: CardFormData) => {
    try {
      setError(null);
      const newCard = await ClientCardService.createCard(
        cardData.germanWord.trim(),
        cardData.translation.trim(),
        cardData.tags
      );
      setCards((prev) => [newCard, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания карточки');
    }
  };

  const handleUpdateCard = async (id: string, cardData: CardFormData) => {
    try {
      setError(null);
      const updatedCard = await ClientCardService.updateCard(id, {
        germanWord: cardData.germanWord.trim(),
        translation: cardData.translation.trim(),
        tags: cardData.tags,
      });
      setCards((prev) =>
        prev.map((card) => (card.id === id ? updatedCard : card))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ошибка обновления карточки'
      );
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      setError(null);
      await ClientCardService.deleteCard(id);
      setCards((prev) => prev.filter((card) => card.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления карточки');
    }
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
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="200px"
            >
              <CircularProgress />
            </Box>
          ) : viewMode === 'viewer' ? (
            <CardViewer
              cards={cards}
              onCardUpdate={(updatedCard) => {
                setCards((prev) =>
                  prev.map((card) =>
                    card.id === updatedCard.id ? updatedCard : card
                  )
                );
              }}
            />
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
