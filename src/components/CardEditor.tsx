'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
  Autocomplete,
  Chip,
  Stack,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  LocalOffer,
  Upload,
  Search,
  ExpandMore,
  Clear,
} from '@mui/icons-material';
import type { Card as CardType, CardFormData, Tag } from '@/types';
import { BulkImport } from './BulkImport';
import { TagManager } from './TagManager';
import { TagFilter } from './TagFilter';
import { ClientCardService, ClientTagService } from '@/services/cardService';

interface CardEditorProps {
  cards: CardType[];
  onAddCard: (card: CardFormData) => void;
  onUpdateCard: (id: string, card: CardFormData) => void;
  onDeleteCard: (id: string) => void;
  onBulkImport?: () => void; // Для обновления списка карточек после импорта
  onCardsUpdate?: () => void; // Для обновления списка карточек после изменения тегов
}

export function CardEditor({
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onBulkImport,
  onCardsUpdate,
}: CardEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [formData, setFormData] = useState<CardFormData>({
    germanWord: '',
    translation: '',
    tags: [],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [errors, setErrors] = useState<Partial<CardFormData>>({});

  // Состояние для фильтрации
  const [searchText, setSearchText] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Загружаем доступные теги при инициализации
  useEffect(() => {
    void loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tags = await ClientTagService.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Ошибка загрузки тегов:', error);
    }
  };

  // Фильтрация карточек
  const filteredCards = useMemo(() => {
    let filtered = cards;

    // Фильтрация по тексту
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (card) =>
          card.germanWord.toLowerCase().includes(searchLower) ||
          card.translation.toLowerCase().includes(searchLower)
      );
    }

    // Фильтрация по тегам
    if (selectedTagIds.size > 0) {
      filtered = filtered.filter((card) =>
        card.tags.some((tag) => selectedTagIds.has(tag.id))
      );
    }

    return filtered;
  }, [cards, searchText, selectedTagIds]);

  // Функции для управления фильтрацией по тегам
  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleSelectAllTags = () => {
    setSelectedTagIds(new Set(availableTags.map((tag) => tag.id)));
  };

  const handleClearTagSelection = () => {
    setSelectedTagIds(new Set());
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSelectedTagIds(new Set());
  };

  const handleOpenModal = (card?: CardType) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        germanWord: card.germanWord,
        translation: card.translation,
        tags: card.tags?.map((tag) => tag.name) ?? [],
      });
    } else {
      setEditingCard(null);
      setFormData({
        germanWord: '',
        translation: '',
        tags: [],
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
      tags: [],
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Преобразуем названия тегов в tagIds
      const tagIds: string[] = [];
      const tagMap = new Map(availableTags.map((tag) => [tag.name, tag.id]));

      for (const tagName of formData.tags ?? []) {
        let tagId = tagMap.get(tagName);
        if (!tagId) {
          // Создаем новый тег
          const newTag = await ClientTagService.createTag(tagName);
          tagId = newTag.id;
          tagMap.set(tagName, tagId);
          // Обновляем список доступных тегов
          setAvailableTags((prev) => [...prev, newTag]);
        }
        tagIds.push(tagId);
      }

      const cardDataWithTags: CardFormData = {
        ...formData,
        tagIds,
      };

      if (editingCard) {
        onUpdateCard(editingCard.id, cardDataWithTags);
      } else {
        onAddCard(cardDataWithTags);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Ошибка сохранения карточки:', error);
      // Можно показать уведомление об ошибке
    }
  };

  const handleInputChange =
    (field: keyof CardFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
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

  const handleBulkImport = async (cards: CardFormData[]) => {
    try {
      await ClientCardService.createBulkCards(cards);
      // Обновляем список карточек
      if (onBulkImport) {
        onBulkImport();
      }
    } catch (error) {
      console.error('Ошибка массового импорта:', error);
      throw error; // Пробрасываем ошибку для обработки в BulkImport
    }
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 800, margin: '0 auto' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          align="center"
          sx={{ mb: 0, flexGrow: 1 }}
        >
          Редактор карточек
        </Typography>
        <Button
          variant="outlined"
          startIcon={<LocalOffer />}
          onClick={() => {
            setIsTagManagerOpen(true);
          }}
          sx={{ ml: 2 }}
        >
          Управление тегами
        </Button>
        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => {
            setIsBulkImportOpen(true);
          }}
          sx={{ ml: 1 }}
        >
          Массовый импорт
        </Button>
      </Box>

      {/* Поиск и фильтрация */}
      <Box sx={{ mb: 3 }}>
        <Accordion
          sx={{
            borderRadius: '12px !important',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            '&:before': {
              display: 'none',
            },
            '&:first-of-type': {
              borderRadius: '12px !important',
            },
            '&:last-of-type': {
              borderRadius: '12px !important',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="search-filter-content"
            id="search-filter-header"
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              borderRadius: '12px 12px 0 0 !important',
              minHeight: 56,
              margin: 0,
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&.Mui-expanded': {
                borderRadius: '12px 12px 0 0 !important',
                margin: 0,
              },
              '&.Mui-focusVisible': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Search />
              <Typography fontWeight="500">Поиск и фильтрация</Typography>
              {(searchText.trim() || selectedTagIds.size > 0) && (
                <Chip
                  label={
                    searchText.trim() && selectedTagIds.size > 0
                      ? 'Текст + Теги'
                      : searchText.trim()
                        ? 'Текст'
                        : 'Теги'
                  }
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                  }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: '0 0 12px 12px !important',
              border: '1px solid',
              borderColor: 'divider',
              borderTop: 'none',
              p: 2,
              margin: 0,
            }}
          >
            <Stack spacing={2}>
              {/* Текстовый поиск */}
              <Box>
                <TextField
                  fullWidth
                  placeholder="Поиск по немецкому слову или переводу..."
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchText && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => {
                            setSearchText('');
                          }}
                          edge="end"
                          size="small"
                        >
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      '&:hover fieldset': {
                        borderColor: '#4fc3f7',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#29b6f6',
                      },
                    },
                  }}
                />
              </Box>

              {/* Фильтрация по тегам */}
              {availableTags.length > 0 && (
                <TagFilter
                  availableTags={availableTags}
                  selectedTagIds={selectedTagIds}
                  onTagToggle={handleTagToggle}
                  onSelectAllTags={handleSelectAllTags}
                  onClearTagSelection={handleClearTagSelection}
                  showStatsChip={false}
                />
              )}

              {/* Кнопка очистки всех фильтров */}
              {(searchText.trim() || selectedTagIds.size > 0) && (
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={handleClearSearch}
                    startIcon={<Clear />}
                    sx={{
                      borderRadius: '20px',
                      textTransform: 'none',
                      fontWeight: '500',
                      borderColor: '#ff6b6b',
                      color: '#ff6b6b',
                      '&:hover': {
                        borderColor: '#ee5a52',
                        backgroundColor: '#ff6b6b20',
                      },
                    }}
                  >
                    Очистить все фильтры
                  </Button>
                </Box>
              )}

              {/* Статистика */}
              <Box
                sx={{
                  textAlign: 'center',
                  p: 1.5,
                  background:
                    'linear-gradient(135deg, #4fc3f722 0%, #29b6f622 100%)',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: '500' }}
                >
                  📊 Показано <strong>{filteredCards.length}</strong> из{' '}
                  <strong>{cards.length}</strong> карточек
                </Typography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>

      {filteredCards.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary">
            {cards.length === 0
              ? 'Карточки не найдены'
              : searchText.trim() || selectedTagIds.size > 0
                ? 'Нет карточек, соответствующих фильтрам'
                : 'Карточки не найдены'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {cards.length === 0
              ? 'Добавьте первую карточку для изучения'
              : searchText.trim() || selectedTagIds.size > 0
                ? 'Попробуйте изменить критерии поиска или очистить фильтры'
                : 'Добавьте первую карточку для изучения'}
          </Typography>
        </Paper>
      ) : (
        <List>
          {filteredCards.map((card, index) => (
            <div key={card.id}>
              <ListItem
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  py: 2,
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      gutterBottom
                    >
                      {card.germanWord}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {card.translation}
                    </Typography>
                    {card.tags && card.tags.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {card.tags.map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.75rem',
                              height: 20,
                              borderRadius: '10px',
                              borderColor: tag.color,
                              color: tag.color,
                              '&:hover': {
                                backgroundColor: `${tag.color}20`,
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <IconButton
                      onClick={() => {
                        handleOpenModal(card);
                      }}
                      color="primary"
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        handleDelete(card.id);
                      }}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </ListItem>
              {index < filteredCards.length - 1 && <Divider />}
            </div>
          ))}
        </List>
      )}

      {/* Кнопка добавления */}
      <Fab
        color="primary"
        onClick={() => {
          handleOpenModal();
        }}
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
            sx={{ mb: 2 }}
          />
          <Autocomplete
            multiple
            freeSolo
            options={availableTags.map((tag) => tag.name)}
            value={formData.tags ?? []}
            onChange={(_, newValue) => {
              setFormData((prev) => ({
                ...prev,
                tags: newValue,
              }));
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const tag = availableTags.find((t) => t.name === option);
                return (
                  <Chip
                    {...getTagProps({ index })}
                    key={index}
                    label={option}
                    size="small"
                    sx={{
                      backgroundColor: tag?.color
                        ? `${tag.color}20`
                        : undefined,
                      borderColor: tag?.color,
                      color: tag?.color,
                      borderRadius: '12px',
                    }}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Теги"
                variant="outlined"
                placeholder="Выберите теги или введите новые"
                helperText="Выберите из списка или введите новые теги для категоризации карточки"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <LocalOffer sx={{ mr: 1, color: 'text.secondary' }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
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
            onClick={() => void handleSubmit()}
            startIcon={<Save />}
            variant="contained"
          >
            {editingCard ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Компонент массового импорта */}
      <BulkImport
        open={isBulkImportOpen}
        onClose={() => {
          setIsBulkImportOpen(false);
        }}
        onImport={handleBulkImport}
        availableTags={availableTags}
      />

      {/* Компонент управления тегами */}
      <TagManager
        open={isTagManagerOpen}
        onClose={() => {
          setIsTagManagerOpen(false);
        }}
        onTagsUpdate={() => {
          void loadTags();
          if (onCardsUpdate) {
            onCardsUpdate();
          }
        }}
      />
    </Box>
  );
}
