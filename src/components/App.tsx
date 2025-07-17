'use client';

import { useState, useEffect } from 'react';
import {
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
import type { Card as CardType, CardFormData, ViewMode } from '@/types';
import { ClientCardService } from '@/services/cardService';

interface AppProps {
  showNavigation?: boolean;
  onCardsCountChange?: (count: number) => void;
  initialViewMode?: 'viewer' | 'editor';
  onViewModeChange?: (mode: 'viewer' | 'editor') => void;
}

export function App({
  showNavigation = true,
  onCardsCountChange,
  initialViewMode = 'viewer',
  onViewModeChange,
}: AppProps) {
  const [cards, setCards] = useState<CardType[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка карточек при инициализации
  useEffect(() => {
    void loadCards();
  }, []);

  // Уведомляем о изменении количества карточек
  useEffect(() => {
    onCardsCountChange?.(cards.length);
  }, [cards.length, onCardsCountChange]);

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Пытаемся загрузить карточки
      const fetchedCards = await ClientCardService.getCards();
      console.log(`Загружено карточек: ${fetchedCards.length}`);

      // Просто устанавливаем карточки (пустой массив для новых пользователей)
      setCards(fetchedCards);
    } catch (err) {
      console.error('Error loading cards:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Ошибка загрузки карточек';

      // Если ошибка аутентификации - не показываем sample данные
      if (
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('401')
      ) {
        setError(
          'Ошибка аутентификации. Пожалуйста, войдите в систему заново.'
        );
        setCards([]); // Очищаем карточки
        return;
      }

      setError(errorMessage);
      setCards([]); // Очищаем карточки при любой ошибке
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
        cardData.tagIds
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
        tagIds: cardData.tagIds,
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
    onViewModeChange?.(newMode);
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
      {/* Основной контент */}
      <Box sx={{ flexGrow: 1, pb: showNavigation ? 8 : 0 }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => {
                setError(null);
              }}
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
              onAddCard={(cardData) => void handleAddCard(cardData)}
              onUpdateCard={(id, cardData) =>
                void handleUpdateCard(id, cardData)
              }
              onDeleteCard={(id) => void handleDeleteCard(id)}
              onBulkImport={() => void loadCards()}
              onCardsUpdate={() => void loadCards()}
            />
          )}
        </Container>
      </Box>

      {/* Нижняя навигация для режимов карточек */}
      {showNavigation && (
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
            onChange={(event, newValue) => {
              handleViewModeChange(newValue as ViewMode);
            }}
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
      )}
    </Box>
  );
}
