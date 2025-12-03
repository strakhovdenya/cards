'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
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
  Settings,
} from '@mui/icons-material';
import { ClientCardService } from '@/services/cardService';
import { ClientTagService } from '@/services/tagService';
import { UniversalCard } from './UniversalCard';
import { TagFilter } from './TagFilter';
import { SpeechSettings } from './SpeechSettings';
import { FrontSideToggle, type FrontSide } from './navigation/FrontSideToggle';
import type { Tag } from '@/types';
import type { CardStrategy, CardData } from '@/types/cardStrategy';

interface UniversalCardViewerProps<T extends CardData = CardData> {
  cards: T[];
  strategy: CardStrategy<T>;
  onCardUpdate?: (updatedCard: T) => void;
  toggleLearnedService?: (id: string, learned: boolean) => Promise<void>;
  isGuest?: boolean;
}

export function UniversalCardViewer<T extends CardData>({
  cards,
  strategy,
  onCardUpdate,
  toggleLearnedService,
  isGuest = false,
}: UniversalCardViewerProps<T>) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<T[]>([]);
  const [frontSide, setFrontSide] = useState<FrontSide>('german');
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Состояние для фильтрации по тегам
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [filteredCards, setFilteredCards] = useState<T[]>([]);

  // На десктопе показываем подсказки по умолчанию, на мобильном - скрываем
  useEffect(() => {
    setShowKeyboardHints(!isMobile);
  }, [isMobile]);

  // Загрузка доступных тегов
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await ClientTagService.getTags(false, { guest: isGuest });
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };
    void loadTags();
  }, [isGuest]);

  // Фильтрация карточек по выбранным тегам
  useEffect(() => {
    if (selectedTagIds.size === 0) {
      setFilteredCards(cards);
    } else {
      const filtered = cards.filter((card) => {
        const tags = strategy.getTags(card);
        return tags?.some((tag) => selectedTagIds.has(tag.id)) ?? false;
      });
      setFilteredCards(filtered);
    }
  }, [cards, selectedTagIds, strategy]);

  useEffect(() => {
    if (filteredCards.length > 0) {
      setShuffledCards([...filteredCards]);
      setCurrentCardIndex(0);
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
    if (!currentCard) return null;

    const tags = strategy.getTags(currentCard);
    if (!tags || tags.length === 0) return null;

    return (
      <Box sx={{ mb: 1.5 }}>
        <Stack
          direction="row"
          spacing={0.75}
          justifyContent="center"
          flexWrap="wrap"
        >
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              variant="outlined"
              sx={{
                borderColor: tag.color,
                color: tag.color,
                borderRadius: '10px',
                fontSize: '0.75rem',
                height: '24px',
                '&:hover': {
                  backgroundColor: `${tag.color}20`,
                },
              }}
            />
          ))}
        </Stack>
      </Box>
    );
  }, [currentCard, strategy]);

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
    if (!currentCard || !onCardUpdate || isGuest) return;

    // Оптимистичное обновление UI
    const optimisticCard = { ...currentCard, learned: !currentCard.learned };
    const optimisticShuffledCards = shuffledCards.map((card) =>
      card.id === currentCard.id ? optimisticCard : card
    );
    setShuffledCards(optimisticShuffledCards);
    onCardUpdate(optimisticCard);

    try {
      // Используем переданный сервис или дефолтный
      if (toggleLearnedService) {
        await toggleLearnedService(currentCard.id, !currentCard.learned);
      } else {
        await ClientCardService.toggleLearnedStatus(
          currentCard.id,
          !currentCard.learned
        );
      }
    } catch (error) {
      console.error('Error toggling learned status:', error);
      // Откатываем изменения при ошибке
      setShuffledCards(shuffledCards);
      onCardUpdate(currentCard);
    }
  }, [currentCard, onCardUpdate, shuffledCards, toggleLearnedService, isGuest]);

  const toggleKeyboardHints = useCallback(() => {
    setShowKeyboardHints((prev) => !prev);
  }, []);

  // Клавиатурные сокращения для быстрой навигации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        case 'p':
        case 'P':
          event.preventDefault();
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
        padding: { xs: 2, sm: 3 },
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* Компактная верхняя панель */}
      <Box sx={{ mb: 2, textAlign: 'center', width: '100%' }}>
        {/* Первая строка: прогресс и переключатель режима */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mb: 1.5,
          }}
        >
          {/* Индикатор прогресса */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                label={`🏷️ ${selectedTagIds.size}`}
                size="small"
                sx={{
                  fontWeight: '500',
                  fontSize: '0.75rem',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  border: 'none',
                  height: '24px',
                }}
              />
            )}
          </Box>

          {/* Переключатель лицевой стороны */}
          <FrontSideToggle
            value={frontSide}
            onChange={(newFrontSide) => {
              setFrontSide(newFrontSide);
              setIsFlipped(false);
            }}
          />

          {/* Кнопка настроек произношения */}
          <Tooltip title="Настройки произношения">
            <IconButton
              size="small"
              onClick={() => {
                setSpeechSettingsOpen(true);
              }}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Settings fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Фильтрация по тегам - свернута по умолчанию */}
      <TagFilter
        availableTags={availableTags}
        selectedTagIds={selectedTagIds}
        onTagToggle={handleTagToggle}
        onSelectAllTags={handleSelectAllTags}
        onClearTagSelection={handleClearTagSelection}
        defaultExpanded={false}
      />

      {/* Карточка */}
      <Box sx={{ mb: 2 }}>
        <UniversalCard
          card={currentCard}
          strategy={strategy}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          frontSide={frontSide}
        />
      </Box>

      {/* Теги */}
      {cardTags}

      {/* Статус изучения */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant={currentCard.learned ? 'contained' : 'outlined'}
          color={currentCard.learned ? 'success' : 'primary'}
          onClick={() => void handleToggleLearned()}
          startIcon={
            currentCard.learned ? <CheckCircle /> : <RadioButtonUnchecked />
          }
          size="medium"
          disabled={isGuest}
        >
          {currentCard.learned ? 'Выучено' : 'Отметить как выученное'}
        </Button>
      </Box>

      {/* Основная подсказка */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {isFlipped
            ? 'Нажмите для возврата'
            : `Нажмите для показа ${frontSide === 'german' ? 'русского перевода' : 'немецкого слова'}`}
        </Typography>

        {/* Кнопка для показа/скрытия горячих клавиш */}
        <Box
          sx={{
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
              mt: 1.5,
              p: 1.5,
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
              <Chip label="P" size="small" variant="outlined" />
            </Stack>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 1, display: 'block' }}
            >
              Навигация • Перевернуть • Выучено • Перемешать • Сменить режим •
              Произношение
            </Typography>
          </Box>
        </Collapse>

        {/* Статистика фильтра */}
        {selectedTagIds.size > 0 && (
          <Box
            sx={{
              mt: 1.5,
              px: 2,
              py: 0.5,
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
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <Button
          variant="outlined"
          onClick={handlePrevious}
          startIcon={<ArrowBack />}
          disabled={shuffledCards.length <= 1}
          size="medium"
        >
          Назад
        </Button>

        <Button
          variant="contained"
          onClick={handleFlip}
          startIcon={<Flip />}
          sx={{ minWidth: 120 }}
          size="medium"
        >
          Перевернуть
        </Button>

        <Button
          variant="outlined"
          onClick={handleNext}
          endIcon={<ArrowForward />}
          disabled={shuffledCards.length <= 1}
          size="medium"
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
        size="medium"
      >
        Перемешать
      </Button>

      {/* Диалог настроек произношения */}
      <SpeechSettings
        open={speechSettingsOpen}
        onClose={() => {
          setSpeechSettingsOpen(false);
        }}
      />
    </Box>
  );
}
