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
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Shuffle,
  Flip,
  CheckCircle,
  RadioButtonUnchecked,
  KeyboardHide,
  Keyboard,
} from '@mui/icons-material';
import { ClientCardService } from '@/services/cardService';
import { ClientTagService } from '@/services/tagService';
import { Card } from './Card';
import { TagFilter } from './TagFilter';
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
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Состояние для фильтрации по тегам
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [filteredCards, setFilteredCards] = useState<CardType[]>([]);

  // На десктопе показываем подсказки по умолчанию, на мобильном - скрываем
  useEffect(() => {
    setShowKeyboardHints(!isMobile);
  }, [isMobile]);

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

  const toggleKeyboardHints = useCallback(() => {
    setShowKeyboardHints((prev) => !prev);
  }, []);

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
          <TagFilter
            availableTags={availableTags}
            selectedTagIds={selectedTagIds}
            onTagToggle={handleTagToggle}
            onSelectAllTags={handleSelectAllTags}
            onClearTagSelection={handleClearTagSelection}
            defaultExpanded={hasFilteredResults}
          />
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
              backgroundColor: 'primary.main',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
            }}
          />
        )}
      </Box>

      {/* Фильтрация по тегам */}
      <TagFilter
        availableTags={availableTags}
        selectedTagIds={selectedTagIds}
        onTagToggle={handleTagToggle}
        onSelectAllTags={handleSelectAllTags}
        onClearTagSelection={handleClearTagSelection}
      />

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

      {/* Основная подсказка */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {isFlipped
            ? 'Нажмите для возврата'
            : `Нажмите для показа ${frontSide === 'german' ? 'русского перевода' : 'немецкого слова'}`}
        </Typography>

        {/* Кнопка для показа/скрытия горячих клавиш */}
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Tooltip
            title={
              showKeyboardHints
                ? 'Скрыть горячие клавиши'
                : 'Показать горячие клавиши'
            }
          >
            <IconButton
              size="small"
              onClick={toggleKeyboardHints}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {showKeyboardHints ? <KeyboardHide /> : <Keyboard />}
            </IconButton>
          </Tooltip>
          {!isMobile && (
            <Typography variant="caption" color="text.disabled">
              {showKeyboardHints ? 'Скрыть' : 'Горячие клавиши'}
            </Typography>
          )}
        </Box>

        {/* Горячие клавиши */}
        <Collapse in={showKeyboardHints}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: '500' }}
            >
              ⌨️ Горячие клавиши:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip label="← →" size="small" variant="outlined" />
              <Chip label="Пробел" size="small" variant="outlined" />
              <Chip label="Enter" size="small" variant="outlined" />
              <Chip label="S" size="small" variant="outlined" />
              <Chip label="F" size="small" variant="outlined" />
            </Stack>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 1, display: 'block' }}
            >
              Навигация • Перевернуть • Выучено • Перемешать • Сменить режим
            </Typography>
          </Box>
        </Collapse>

        {/* Статистика фильтра */}
        {selectedTagIds.size > 0 && (
          <Box
            sx={{
              mt: 2,
              px: 2,
              py: 1,
              backgroundColor: 'primary.50',
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'primary.200',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: '500', color: 'primary.main' }}
            >
              📊 Показано {shuffledCards.length} из {cards.length} карточек
            </Typography>
          </Box>
        )}
      </Box>

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
