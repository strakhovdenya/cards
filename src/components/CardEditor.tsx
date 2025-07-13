'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
} from '@mui/material';
import { Add, Edit, Delete, Save, Cancel } from '@mui/icons-material';
import { Card as CardType, CardFormData } from '@/types';

interface CardEditorProps {
  cards: CardType[];
  onAddCard: (card: CardFormData) => void;
  onUpdateCard: (id: string, card: CardFormData) => void;
  onDeleteCard: (id: string) => void;
}

export function CardEditor({
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
}: CardEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [formData, setFormData] = useState<CardFormData>({
    germanWord: '',
    translation: '',
  });
  const [errors, setErrors] = useState<Partial<CardFormData>>({});

  const handleOpenModal = (card?: CardType) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        germanWord: card.germanWord,
        translation: card.translation,
      });
    } else {
      setEditingCard(null);
      setFormData({
        germanWord: '',
        translation: '',
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCard(null);
    setFormData({
      germanWord: '',
      translation: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CardFormData> = {};

    if (!formData.germanWord.trim()) {
      newErrors.germanWord = 'Немецкое слово обязательно';
    }

    if (!formData.translation.trim()) {
      newErrors.translation = 'Перевод обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingCard) {
      onUpdateCard(editingCard.id, formData);
    } else {
      onAddCard(formData);
    }

    handleCloseModal();
  };

  const handleInputChange =
    (field: keyof CardFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));

      // Очищаем ошибку при изменении
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить эту карточку?')) {
      onDeleteCard(id);
    }
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom align="center">
        Редактор карточек
      </Typography>

      {cards.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Карточки не найдены
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Добавьте первую карточку для изучения
          </Typography>
        </Paper>
      ) : (
        <List>
          {cards.map((card, index) => (
            <div key={card.id}>
              <ListItem
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="medium">
                      {card.germanWord}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {card.translation}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleOpenModal(card)}
                    color="primary"
                    sx={{ mr: 1 }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(card.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < cards.length - 1 && <Divider />}
            </div>
          ))}
        </List>
      )}

      {/* Кнопка добавления */}
      <Fab
        color="primary"
        onClick={() => handleOpenModal()}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <Add />
      </Fab>

      {/* Модальное окно */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          {editingCard ? 'Редактировать карточку' : 'Добавить карточку'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Немецкое слово"
            fullWidth
            variant="outlined"
            value={formData.germanWord}
            onChange={handleInputChange('germanWord')}
            error={!!errors.germanWord}
            helperText={errors.germanWord}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Перевод"
            fullWidth
            variant="outlined"
            value={formData.translation}
            onChange={handleInputChange('translation')}
            error={!!errors.translation}
            helperText={errors.translation}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseModal}
            startIcon={<Cancel />}
            color="inherit"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            startIcon={<Save />}
            variant="contained"
          >
            {editingCard ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
