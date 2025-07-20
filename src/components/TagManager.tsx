'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  LocalOffer,
  Palette,
} from '@mui/icons-material';
import { ClientTagService } from '@/services/tagService';
import type { Tag, CreateTagRequest, UpdateTagRequest } from '@/types';

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
  onTagsUpdate?: () => void; // Callback для обновления списка после изменений
}

// Предустановленные цвета для тегов
const PRESET_COLORS = [
  '#4caf50', // Зеленый
  '#ff9800', // Оранжевый
  '#f44336', // Красный
  '#9c27b0', // Фиолетовый
  '#e91e63', // Розовый
  '#ff5722', // Темно-оранжевый
  '#795548', // Коричневый
  '#607d8b', // Синий-серый
  '#3f51b5', // Синий
  '#8bc34a', // Светло-зеленый
  '#ffeb3b', // Желтый
  '#00bcd4', // Циан
];

export function TagManager({ open, onClose, onTagsUpdate }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Состояние для создания/редактирования тега
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm, setTagForm] = useState({
    name: '',
    color: '#2196f3',
  });
  const [tagFormErrors, setTagFormErrors] = useState<{
    name?: string;
  }>({});

  // Загрузка тегов
  const loadTags = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTags = await ClientTagService.getTags(forceRefresh);
      setTags(fetchedTags);
    } catch (err) {
      console.error('Error loading tags:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки тегов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadTags();
    }
  }, [open]);

  // Создание/редактирование тега
  const handleOpenTagDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({
        name: tag.name,
        color: tag.color,
      });
    } else {
      setEditingTag(null);
      setTagForm({
        name: '',
        color: '#2196f3',
      });
    }
    setTagFormErrors({});
    setIsTagDialogOpen(true);
  };

  const handleCloseTagDialog = () => {
    setIsTagDialogOpen(false);
    setEditingTag(null);
    setTagForm({ name: '', color: '#2196f3' });
    setTagFormErrors({});
  };

  const validateTagForm = (): boolean => {
    const errors: { name?: string } = {};

    if (!tagForm.name.trim()) {
      errors.name = 'Название тега обязательно';
    } else if (tagForm.name.trim().length > 50) {
      errors.name = 'Название тега не должно превышать 50 символов';
    }

    setTagFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTag = async () => {
    if (!validateTagForm()) return;

    try {
      if (editingTag) {
        // Обновление существующего тега
        const updateData: UpdateTagRequest = {
          name: tagForm.name.trim(),
          color: tagForm.color,
        };
        await ClientTagService.updateTag(editingTag.id, updateData);
      } else {
        // Создание нового тега
        const createData: CreateTagRequest = {
          name: tagForm.name.trim(),
          color: tagForm.color,
        };
        await ClientTagService.createTag(createData.name, createData.color);
      }

      // Обновляем список тегов из кеша
      await loadTags(true);
      handleCloseTagDialog();
      if (onTagsUpdate) {
        onTagsUpdate();
      }
    } catch (err) {
      console.error('Error saving tag:', err);
      if (err instanceof Error && err.message.includes('already exists')) {
        setTagFormErrors({ name: 'Тег с таким названием уже существует' });
      } else {
        setError(err instanceof Error ? err.message : 'Ошибка сохранения тега');
      }
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (
      !window.confirm(
        `Удалить тег "${tagName}"? Он будет удален со всех карточек.`
      )
    ) {
      return;
    }

    try {
      await ClientTagService.deleteTag(tagId);
      // Обновляем список тегов из кеша
      await loadTags(true);
      if (onTagsUpdate) {
        onTagsUpdate();
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError(err instanceof Error ? err.message : 'Ошибка удаления тега');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocalOffer />
            Управление тегами
          </Box>
        </DialogTitle>

        <DialogContent>
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

          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                handleOpenTagDialog();
              }}
            >
              Создать тег
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : tags.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Теги не найдены
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Создайте первый тег для организации карточек
              </Typography>
            </Paper>
          ) : (
            <List>
              {tags.map((tag, index) => (
                <div key={tag.id}>
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
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={tag.name}
                            size="small"
                            sx={{
                              bgcolor: tag.color,
                              color: 'white',
                              fontWeight: 'medium',
                            }}
                          />
                        </Box>
                      }
                      secondary={`Создан: ${new Date(tag.createdAt).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Редактировать">
                        <IconButton
                          edge="end"
                          onClick={() => {
                            handleOpenTagDialog(tag);
                          }}
                          color="primary"
                          sx={{ mr: 1 }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton
                          edge="end"
                          onClick={() => {
                            void handleDeleteTag(tag.id, tag.name);
                          }}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < tags.length - 1 && (
                    <Box sx={{ height: 1, bgcolor: 'divider', mx: 2 }} />
                  )}
                </div>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания/редактирования тега */}
      <Dialog
        open={isTagDialogOpen}
        onClose={handleCloseTagDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTag ? 'Редактировать тег' : 'Создать тег'}
        </DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название тега"
            fullWidth
            variant="outlined"
            value={tagForm.name}
            onChange={(e) => {
              setTagForm((prev) => ({ ...prev, name: e.target.value }));
            }}
            error={!!tagFormErrors.name}
            helperText={tagFormErrors.name}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocalOffer />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Цвет тега:
            </Typography>

            {/* Предварительный просмотр */}
            <Box sx={{ mb: 2 }}>
              <Chip
                label={tagForm.name || 'Пример тега'}
                sx={{
                  bgcolor: tagForm.color,
                  color: 'white',
                  fontWeight: 'medium',
                }}
              />
            </Box>

            {/* Палитра цветов */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                mb: 2,
              }}
            >
              {PRESET_COLORS.map((color) => (
                <Box
                  key={color}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: color,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border:
                      tagForm.color === color
                        ? '3px solid #000'
                        : '1px solid #ddd',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => {
                    setTagForm((prev) => ({ ...prev, color }));
                  }}
                />
              ))}
            </Box>

            {/* Ручной ввод цвета */}
            <TextField
              label="Или введите hex цвет"
              value={tagForm.color}
              onChange={(e) => {
                setTagForm((prev) => ({ ...prev, color: e.target.value }));
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Palette />
                  </InputAdornment>
                ),
              }}
              helperText="Формат: #ff0000"
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseTagDialog} startIcon={<Cancel />}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              void handleSaveTag();
            }}
            variant="contained"
            startIcon={<Save />}
          >
            {editingTag ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
