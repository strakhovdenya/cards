'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Shuffle,
  Flip,
  CheckCircle,
  RadioButtonUnchecked,
  FilterList,
  ExpandMore,
} from '@mui/icons-material';
import { ClientCardService } from '@/services/cardService';
import { ClientTagService } from '@/services/tagService';
import { Card } from './Card';
import type { Card as CardType, Tag } from '@/types';

interface CardViewerProps {
  cards: CardType[];
  onCardUpdate?: (updatedCard: CardType) => void;
}

export function CardViewer({ cards, onCardUpdate }: CardViewerProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<CardType[]>([]);
  const [frontSide, setFrontSide] = useState<'german' | 'russian'>('german');

  // Состояние для фильтрации по тегам
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [filteredCards, setFilteredCards] = useState<CardType[]>([]);

  // Загрузка доступных тегов
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await ClientTagService.getTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };
    void loadTags();
  }, []);

  // Фильтрация карточек по выбранным тегам
  useEffect(() => {
    if (selectedTagIds.size === 0) {
      // Если ни один тег не выбран, показываем все карточки
      setFilteredCards(cards);
    } else {
      // Фильтруем карточки, которые содержат хотя бы один из выбранных тегов
      const filtered = cards.filter((card) =>
        card.tags.some((tag) => selectedTagIds.has(tag.id))
      );
      setFilteredCards(filtered);
    }
  }, [cards, selectedTagIds]);

  useEffect(() => {
    if (filteredCards.length > 0) {
      setShuffledCards([...filteredCards]);
      setCurrentCardIndex(0); // Сбрасываем индекс при изменении фильтра
    } else {
      setShuffledCards([]);
      setCurrentCardIndex(0);
    }
  }, [filteredCards]);

  // Функции для управления фильтрацией по тегам
  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllTags = useCallback(() => {
    setSelectedTagIds(new Set(availableTags.map((tag) => tag.id)));
  }, [availableTags]);

  const handleClearTagSelection = useCallback(() => {
    setSelectedTagIds(new Set());
  }, []);

  const currentCard = shuffledCards[currentCardIndex];

  // Мемоизируем теги для оптимизации
  const cardTags = useMemo(() => {
    if (!currentCard?.tags || currentCard.tags.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
        >
          {currentCard.tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              variant="outlined"
              sx={{
                borderColor: tag.color,
                color: tag.color,
                '&:hover': {
                  backgroundColor: `${tag.color}20`, // 20% прозрачность
                },
              }}
            />
          ))}
        </Stack>
      </Box>
    );
  }, [currentCard?.tags]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % shuffledCards.length);
  }, [shuffledCards.length]);

  const handlePrevious = useCallback(() => {
    setIsFlipped(false);
    setCurrentCardIndex(
      (prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length
    );
  }, [shuffledCards.length]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [shuffledCards]);

  const handleToggleLearned = useCallback(async () => {
    if (!currentCard || !onCardUpdate) return;

    // Оптимистичное обновление UI
    const optimisticCard = { ...currentCard, learned: !currentCard.learned };
    const optimisticShuffledCards = shuffledCards.map((card) =>
      card.id === currentCard.id ? optimisticCard : card
    );
    setShuffledCards(optimisticShuffledCards);
    onCardUpdate(optimisticCard);

    try {
      // Отправляем запрос в фоне
      await ClientCardService.toggleLearnedStatus(
        currentCard.id,
        !currentCard.learned
      );
    } catch (error) {
      console.error('Error toggling learned status:', error);
      // Откатываем изменения при ошибке
      setShuffledCards(shuffledCards);
      onCardUpdate(currentCard);
    }
  }, [currentCard, onCardUpdate, shuffledCards]);

  const handleChangeFrontSide = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newFrontSide: 'german' | 'russian' | null
    ) => {
      if (newFrontSide !== null) {
        setFrontSide(newFrontSide);
        setIsFlipped(false); // Сбрасываем флип при смене режима
      }
    },
    []
  );

  // Клавиатурные сокращения для быстрой навигации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Проверяем условие, но не возвращаемся рано из хука
      const canNavigate = shuffledCards.length > 1;

      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (canNavigate) {
            event.preventDefault();
            handlePrevious();
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (canNavigate) {
            event.preventDefault();
            handleNext();
          }
          break;
        case ' ':
        case 'Space':
          event.preventDefault();
          handleFlip();
          break;
        case 's':
        case 'S':
          if (canNavigate) {
            event.preventDefault();
            handleShuffle();
          }
          break;
        case 'Enter':
          event.preventDefault();
          void handleToggleLearned();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          setFrontSide((prev) => (prev === 'german' ? 'russian' : 'german'));
          setIsFlipped(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleNext,
    handlePrevious,
    handleFlip,
    handleShuffle,
    handleToggleLearned,
    shuffledCards.length,
  ]);

  if (!currentCard) {
    const hasFilteredResults =
      filteredCards.length === 0 && selectedTagIds.size > 0;
    const hasNoCards = cards.length === 0;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: 3,
        }}
      >
        {/* Фильтрация по тегам (показываем даже когда нет результатов) */}
        {availableTags.length > 0 && !hasNoCards && (
          <Box sx={{ mb: 3, width: '100%', maxWidth: 600 }}>
            <Accordion defaultExpanded={hasFilteredResults}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="tag-filter-content"
                id="tag-filter-header"
                sx={{
                  background:
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background:
                      'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                  borderRadius: '12px 12px 0 0',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterList />
                  <Typography fontWeight="500">Фильтрация по тегам</Typography>
                  {selectedTagIds.size > 0 && (
                    <Chip
                      label={selectedTagIds.size}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  background:
                    'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderRadius: '0 0 12px 12px',
                  border: '1px solid #e0e0e0',
                  borderTop: 'none',
                }}
              >
                <Box sx={{ width: '100%' }}>
                  {/* Кнопки управления */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      mb: 3,
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSelectAllTags}
                      disabled={selectedTagIds.size === availableTags.length}
                      sx={{
                        background:
                          'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                        borderRadius: '20px',
                        textTransform: 'none',
                        fontWeight: '500',
                        boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                        '&:hover': {
                          background:
                            'linear-gradient(45deg, #45a049 30%, #3d8b40 90%)',
                        },
                        '&:disabled': {
                          background: '#bdbdbd',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      ✨ Выбрать все
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleClearTagSelection}
                      disabled={selectedTagIds.size === 0}
                      sx={{
                        background:
                          'linear-gradient(45deg, #ff6b6b 30%, #ee5a52 90%)',
                        borderRadius: '20px',
                        textTransform: 'none',
                        fontWeight: '500',
                        boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)',
                        '&:hover': {
                          background:
                            'linear-gradient(45deg, #ee5a52 30%, #dc4c48 90%)',
                        },
                        '&:disabled': {
                          background: '#bdbdbd',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      🗑️ Очистить
                    </Button>
                  </Box>

                  {/* Теги */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      justifyContent: 'center',
                      p: 2,
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '16px',
                      border: '2px dashed #e0e0e0',
                    }}
                  >
                    {availableTags.map((tag) => {
                      const isSelected = selectedTagIds.has(tag.id);
                      return (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          onClick={() => { handleTagToggle(tag.id); }}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{
                            borderColor: tag.color,
                            borderWidth: '2px',
                            color: isSelected ? 'white' : tag.color,
                            backgroundColor: isSelected
                              ? tag.color
                              : 'transparent',
                            fontWeight: isSelected ? 'bold' : '500',
                            fontSize: '0.875rem',
                            height: '36px',
                            borderRadius: '18px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isSelected
                              ? `0 4px 12px ${tag.color}40`
                              : '0 2px 4px rgba(0,0,0,0.1)',
                            '&:hover': {
                              backgroundColor: isSelected
                                ? tag.color
                                : `${tag.color}20`,
                              transform: 'scale(1.05)',
                              boxShadow: `0 4px 12px ${tag.color}40`,
                              borderColor: tag.color,
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                            },
                          }}
                        />
                      );
                    })}
                  </Box>

                  {/* Статистика */}
                  {selectedTagIds.size > 0 && (
                    <Box
                      sx={{
                        mt: 2,
                        textAlign: 'center',
                        p: 1.5,
                        background:
                          'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: '500' }}
                      >
                        📊 Выбрано тегов: <strong>{selectedTagIds.size}</strong>{' '}
                        из {availableTags.length}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        <Typography variant="h5" color="text.secondary">
          {hasFilteredResults
            ? 'Нет карточек с выбранными тегами'
            : 'Карточки не найдены'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          {hasFilteredResults
            ? 'Попробуйте изменить фильтр тегов или очистить выбор'
            : 'Добавьте карточки для изучения'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 3,
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* Индикатор прогресса */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Chip
          label={`${currentCardIndex + 1} из ${shuffledCards.length}`}
          color="primary"
          variant="outlined"
          size="small"
          sx={{
            fontWeight: 'bold',
            fontSize: '0.875rem',
            background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
          }}
        />
        {selectedTagIds.size > 0 && (
          <Chip
            label={`🏷️ Фильтр: ${selectedTagIds.size} тег${selectedTagIds.size === 1 ? '' : selectedTagIds.size < 5 ? 'а' : 'ов'}`}
            sx={{
              ml: 1,
              fontWeight: '500',
              fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            }}
          />
        )}
      </Box>

      {/* Фильтрация по тегам */}
      {availableTags.length > 0 && (
        <Box sx={{ mb: 3, width: '100%', maxWidth: 600 }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="tag-filter-content"
              id="tag-filter-header"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background:
                    'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                },
                borderRadius: '12px 12px 0 0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList />
                <Typography fontWeight="500">Фильтрация по тегам</Typography>
                {selectedTagIds.size > 0 && (
                  <Chip
                    label={selectedTagIds.size}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '0 0 12px 12px',
                border: '1px solid #e0e0e0',
                borderTop: 'none',
              }}
            >
              <Box sx={{ width: '100%' }}>
                {/* Кнопки управления */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    mb: 3,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSelectAllTags}
                    disabled={selectedTagIds.size === availableTags.length}
                    sx={{
                      background:
                        'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                      borderRadius: '20px',
                      textTransform: 'none',
                      fontWeight: '500',
                      boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                      '&:hover': {
                        background:
                          'linear-gradient(45deg, #45a049 30%, #3d8b40 90%)',
                      },
                      '&:disabled': {
                        background: '#bdbdbd',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    ✨ Выбрать все
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleClearTagSelection}
                    disabled={selectedTagIds.size === 0}
                    sx={{
                      background:
                        'linear-gradient(45deg, #ff6b6b 30%, #ee5a52 90%)',
                      borderRadius: '20px',
                      textTransform: 'none',
                      fontWeight: '500',
                      boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)',
                      '&:hover': {
                        background:
                          'linear-gradient(45deg, #ee5a52 30%, #dc4c48 90%)',
                      },
                      '&:disabled': {
                        background: '#bdbdbd',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    🗑️ Очистить
                  </Button>
                </Box>

                {/* Теги */}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    justifyContent: 'center',
                    p: 2,
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '16px',
                    border: '2px dashed #e0e0e0',
                  }}
                >
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.has(tag.id);
                    return (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        onClick={() => { handleTagToggle(tag.id); }}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{
                          borderColor: tag.color,
                          borderWidth: '2px',
                          color: isSelected ? 'white' : tag.color,
                          backgroundColor: isSelected
                            ? tag.color
                            : 'transparent',
                          fontWeight: isSelected ? 'bold' : '500',
                          fontSize: '0.875rem',
                          height: '36px',
                          borderRadius: '18px',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isSelected
                            ? `0 4px 12px ${tag.color}40`
                            : '0 2px 4px rgba(0,0,0,0.1)',
                          '&:hover': {
                            backgroundColor: isSelected
                              ? tag.color
                              : `${tag.color}20`,
                            transform: 'scale(1.05)',
                            boxShadow: `0 4px 12px ${tag.color}40`,
                            borderColor: tag.color,
                          },
                          '&:active': {
                            transform: 'scale(0.95)',
                          },
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Статистика */}
                {selectedTagIds.size > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      textAlign: 'center',
                      p: 1.5,
                      background:
                        'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: '500' }}
                    >
                      📊 Выбрано тегов: <strong>{selectedTagIds.size}</strong>{' '}
                      из {availableTags.length}
                    </Typography>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* Переключатель лицевой стороны */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Tooltip title="Выберите какую сторону показывать первой">
          <ToggleButtonGroup
            value={frontSide}
            exclusive
            onChange={handleChangeFrontSide}
            size="small"
            color="primary"
          >
            <ToggleButton value="german">de → ru</ToggleButton>
            <ToggleButton value="russian">ru → de</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>

      {/* Карточка */}
      <Box sx={{ mb: 4 }}>
        <Card
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          frontSide={frontSide}
        />
      </Box>

      {/* Теги */}
      {cardTags}

      {/* Статус изучения */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant={currentCard.learned ? 'contained' : 'outlined'}
          color={currentCard.learned ? 'success' : 'primary'}
          onClick={() => void handleToggleLearned()}
          startIcon={
            currentCard.learned ? <CheckCircle /> : <RadioButtonUnchecked />
          }
        >
          {currentCard.learned ? 'Выучено' : 'Отметить как выученное'}
        </Button>
      </Box>

      {/* Подсказка */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, textAlign: 'center' }}
      >
        {isFlipped
          ? 'Нажмите для возврата'
          : `Нажмите для показа ${frontSide === 'german' ? 'русского перевода' : 'немецкого слова'}`}
        <br />
        <Typography component="span" variant="caption" color="text.disabled">
          ⌨️ Горячие клавиши: ← → (навигация), Пробел (перевернуть), Enter
          (выучено), S (перемешать), F (сменить режим)
        </Typography>
        {selectedTagIds.size > 0 && (
          <>
            <br />
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                mt: 1,
                px: 2,
                py: 0.5,
                background:
                  'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
              }}
            >
              <Typography
                component="span"
                variant="caption"
                sx={{ fontWeight: '500', color: '#667eea' }}
              >
                📊 Показано {shuffledCards.length} из {cards.length} карточек
                (фильтр активен)
              </Typography>
            </Box>
          </>
        )}
      </Typography>

      {/* Кнопки управления */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handlePrevious}
          startIcon={<ArrowBack />}
          disabled={shuffledCards.length <= 1}
        >
          Назад
        </Button>

        <Button
          variant="contained"
          onClick={handleFlip}
          startIcon={<Flip />}
          sx={{ minWidth: 120 }}
        >
          Перевернуть
        </Button>

        <Button
          variant="outlined"
          onClick={handleNext}
          endIcon={<ArrowForward />}
          disabled={shuffledCards.length <= 1}
        >
          Вперёд
        </Button>
      </Stack>

      {/* Кнопка перемешивания */}
      <Button
        variant="outlined"
        onClick={handleShuffle}
        startIcon={<Shuffle />}
        color="secondary"
        disabled={shuffledCards.length <= 1}
      >
        Перемешать
      </Button>
    </Box>
  );
}
