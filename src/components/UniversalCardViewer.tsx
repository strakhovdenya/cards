'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
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
import { ClientTagService } from '@/services/tagService';
import { reconcile, type MutationResult } from '@/services/mutationResult';
import { UniversalCard } from './UniversalCard';
import { TagFilter } from './TagFilter';
import { SpeechSettings } from './SpeechSettings';
import { FrontSideToggle, type FrontSide } from './navigation/FrontSideToggle';
import { shouldIgnoreShortcut } from '@/utils/keyboardEventUtils';
import type { Tag } from '@/types';
import type { CardStrategy, CardData } from '@/types/cardStrategy';

interface UniversalCardViewerProps<T extends CardData = CardData> {
  cards: T[];
  strategy: CardStrategy<T>;
  onCardUpdate?: (updatedCard: T) => void;
  // Отправляет явное целевое значение, поэтому повтор безопасен
  toggleLearnedService?: (
    id: string,
    learned: boolean
  ) => Promise<MutationResult<unknown>>;
  // Перечитывает одну карточку для сверки неизвестного результата
  refetchCard?: (id: string) => Promise<Pick<CardData, 'learned'>>;
  isGuest?: boolean;
  // Отметка гостя: синхронно и только на устройстве, без запросов к серверу
  onGuestToggleLearned?: (id: string, learned: boolean) => void;
}

// Сессия хранит только идентификаторы: сами карточки всегда берутся из props.
// setKey — состав набора; пока он не меняется, порядок и позиция сохраняются
interface Session {
  setKey: string;
  order: string[];
  index: number;
}

interface LearnedStatus {
  cardId: string;
  severity: 'error' | 'warning';
  message: string;
}

const MSG_UNCONFIRMED =
  'Сохранение не подтверждено. Проверяем статус на сервере…';
const MSG_UNVERIFIED =
  'Сохранение не подтверждено: не удалось проверить статус на сервере.';
const MSG_NOT_APPLIED =
  'По данным сервера отметка не сохранена, значение обновлено.';

const toSetKey = (ids: string[]) => [...ids].sort().join('\n');

const createSession = (setKey: string, ids: string[]): Session => ({
  setKey,
  order: ids,
  index: 0,
});

const shuffleIds = (ids: string[]) => [...ids].sort(() => Math.random() - 0.5);

// Исключение сервиса не доказывает, что запись не выполнена
const toUnknownResult = (error: unknown): MutationResult<unknown> => {
  console.error('Error toggling learned status:', error);
  return {
    status: 'unknown',
    message: 'Результат операции неизвестен.',
    httpStatus: null,
  };
};

export function UniversalCardViewer<T extends CardData>({
  cards,
  strategy,
  onCardUpdate,
  toggleLearnedService,
  refetchCard,
  isGuest = false,
  onGuestToggleLearned,
}: UniversalCardViewerProps<T>) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontSide, setFrontSide] = useState<FrontSide>('german');
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Состояние для фильтрации по тегам
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  const filteredCards = useMemo(() => {
    if (selectedTagIds.size === 0) return cards;
    return cards.filter((card) => {
      const tags = strategy.getTags(card);
      return tags?.some((tag) => selectedTagIds.has(tag.id)) ?? false;
    });
  }, [cards, selectedTagIds, strategy]);

  const cardsById = useMemo(
    () => new Map(filteredCards.map((card) => [card.id, card])),
    [filteredCards]
  );
  const filteredIds = useMemo(() => [...cardsById.keys()], [cardsById]);
  const setKey = useMemo(() => toSetKey(filteredIds), [filteredIds]);

  const [session, setSession] = useState<Session>(() =>
    createSession(setKey, filteredIds)
  );
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [learnedStatus, setLearnedStatus] = useState<LearnedStatus | null>(
    null
  );
  // Синхронная защита от повторного вызова до перерисовки (автоповтор Enter)
  const toggleInFlightRef = useRef(false);
  const latestCardsRef = useRef(cards);

  useEffect(() => {
    latestCardsRef.current = cards;
  }, [cards]);

  // Набор сменился (фильтр, загрузка, добавление, удаление) — новая сессия.
  // Новый массив с теми же карточками (например, после отметки) её не трогает
  if (session.setKey !== setKey) {
    setSession(createSession(setKey, filteredIds));
    setIsFlipped(false);
  }

  const sessionSize = session.order.length;

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

  const currentCard = cardsById.get(session.order[session.index]);

  // Мемоизируем теги для оптимизации
  const cardTags = useMemo(() => {
    if (!currentCard) return null;

    const tags = strategy.getTags(currentCard);
    if (!tags || tags.length === 0) return null;

    return (
      <Box sx={{ mb: { xs: 1, sm: 1.5 } }}>
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
    setSession((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.order.length,
    }));
  }, []);

  const handlePrevious = useCallback(() => {
    setIsFlipped(false);
    setSession((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.order.length) % prev.order.length,
    }));
  }, []);

  const handleShuffle = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      order: shuffleIds(prev.order),
      index: 0,
    }));
    setIsFlipped(false);
  }, []);

  // Значение применяется к актуальной версии карточки из props, а не к
  // снимку до запроса: обновления родителя за время ожидания не теряются
  const applyLearned = useCallback(
    (cardId: string, learned: boolean) => {
      const latest = latestCardsRef.current.find((card) => card.id === cardId);
      if (latest && onCardUpdate) onCardUpdate({ ...latest, learned });
    },
    [onCardUpdate]
  );

  // Сверка неизвестного результата: перечитывается только эта карточка,
  // набор и позиция сессии не пересобираются
  const reconcileLearned = useCallback(
    async (cardId: string, target: boolean) => {
      if (!refetchCard) {
        setLearnedStatus({
          cardId,
          severity: 'warning',
          message: MSG_UNVERIFIED,
        });
        return;
      }
      try {
        const { found } = await reconcile(
          () => refetchCard(cardId),
          (serverCard) => serverCard.learned === target
        );
        if (found) {
          setLearnedStatus(null);
          return;
        }
        applyLearned(cardId, !target);
        setLearnedStatus({
          cardId,
          severity: 'error',
          message: MSG_NOT_APPLIED,
        });
      } catch (error) {
        console.error('Error reconciling learned status:', error);
        setLearnedStatus({
          cardId,
          severity: 'warning',
          message: MSG_UNVERIFIED,
        });
      }
    },
    [applyLearned, refetchCard]
  );

  const handleToggleLearned = useCallback(async () => {
    if (!currentCard) return;
    // Гостю серверная отметка недоступна, даже если сервис передан
    if (isGuest) {
      onGuestToggleLearned?.(currentCard.id, !currentCard.learned);
      return;
    }
    if (!onCardUpdate || !toggleLearnedService) return;
    if (toggleInFlightRef.current) return;

    const cardId = currentCard.id;
    const target = !currentCard.learned;
    toggleInFlightRef.current = true;
    setPendingCardId(cardId);
    setLearnedStatus(null);
    applyLearned(cardId, target);

    try {
      const result = await toggleLearnedService(cardId, target).catch(
        toUnknownResult
      );
      if (result.status === 'rejected') {
        applyLearned(cardId, !target);
        setLearnedStatus({
          cardId,
          severity: 'error',
          message: `Не удалось сохранить отметку: ${result.message}`,
        });
      } else if (result.status === 'unknown') {
        setLearnedStatus({
          cardId,
          severity: 'warning',
          message: MSG_UNCONFIRMED,
        });
        await reconcileLearned(cardId, target);
      }
    } finally {
      toggleInFlightRef.current = false;
      setPendingCardId(null);
    }
  }, [
    currentCard,
    onCardUpdate,
    toggleLearnedService,
    isGuest,
    onGuestToggleLearned,
    applyLearned,
    reconcileLearned,
  ]);

  const toggleKeyboardHints = useCallback(() => {
    setShowKeyboardHints((prev) => !prev);
  }, []);

  // Клавиатурные сокращения для быстрой навигации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreShortcut(event)) return;

      const canNavigate = sessionSize > 1;

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
    sessionSize,
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
        padding: { xs: 1.5, sm: 3 },
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* Компактная верхняя панель */}
      <Box sx={{ mb: { xs: 1, sm: 2 }, textAlign: 'center', width: '100%' }}>
        {/* Первая строка: прогресс и переключатель режима */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mb: { xs: 1, sm: 1.5 },
          }}
        >
          {/* Индикатор прогресса */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`${session.index + 1} из ${sessionSize}`}
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
      <Box sx={{ mb: { xs: 1, sm: 2 } }}>
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
      <Box sx={{ mb: { xs: 1, sm: 2 } }}>
        <Button
          variant={currentCard.learned ? 'contained' : 'outlined'}
          color={currentCard.learned ? 'success' : 'primary'}
          onClick={() => void handleToggleLearned()}
          startIcon={
            currentCard.learned ? <CheckCircle /> : <RadioButtonUnchecked />
          }
          size="medium"
          disabled={
            isGuest
              ? !onGuestToggleLearned
              : !toggleLearnedService || pendingCardId !== null
          }
        >
          {currentCard.learned ? 'Выучено' : 'Отметить как выученное'}
        </Button>
      </Box>

      {learnedStatus?.cardId === currentCard.id ? (
        <Alert
          severity={learnedStatus.severity}
          onClose={() => {
            setLearnedStatus(null);
          }}
          sx={{ mb: { xs: 1, sm: 2 }, width: '100%' }}
        >
          {learnedStatus.message}
        </Alert>
      ) : null}

      {/* Основная подсказка */}
      <Box sx={{ mb: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
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
              📊 Показано {sessionSize} из {cards.length} карточек
            </Typography>
          </Box>
        )}
      </Box>

      {/* Кнопки управления */}
      <Stack direction="row" spacing={1.5} sx={{ mb: { xs: 1, sm: 1.5 } }}>
        <Button
          variant="outlined"
          onClick={handlePrevious}
          startIcon={<ArrowBack />}
          disabled={sessionSize <= 1}
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
          disabled={sessionSize <= 1}
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
        disabled={sessionSize <= 1}
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
