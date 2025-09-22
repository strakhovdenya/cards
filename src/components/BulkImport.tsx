'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Upload,
  Preview,
  SmartToy,
  ContentCopy,
  Close,
  LocalOffer,
  ExpandMore,
  Warning,
} from '@mui/icons-material';
import type { CardFormData, Tag, Card } from '@/types';
import { TagFilter } from './TagFilter';
import { ClientCardService } from '@/services/cardService';
import { BasicBulkImportStrategy } from '@/strategies/BasicBulkImportStrategy';
import type { ParseResult } from '@/strategies/BulkImportStrategy';

interface BulkImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (cards: CardFormData[]) => Promise<void>;
  availableTags?: Tag[]; // Доступные теги для выбора
}

// Создаем экземпляр стратегии
const importStrategy = new BasicBulkImportStrategy();

export function BulkImport({
  open,
  onClose,
  onImport,
  availableTags = [],
}: BulkImportProps) {
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGptPromptOpen, setIsGptPromptOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [existingCards, setExistingCards] = useState<Card[]>([]);
  const [loadingExistingCards, setLoadingExistingCards] = useState(false);

  // Состояние для выбора тегов
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Загружаем существующие карточки при открытии диалога
  useEffect(() => {
    if (open) {
      void loadExistingCards();
    }
  }, [open]);

  const loadExistingCards = async () => {
    try {
      setLoadingExistingCards(true);
      const cards = await ClientCardService.getCards();
      setExistingCards(cards);
    } catch (error) {
      console.error('Ошибка загрузки существующих карточек:', error);
    } finally {
      setLoadingExistingCards(false);
    }
  };

  // Функции для управления выбором тегов
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

  // Парсинг текста в карточки с проверкой дубликатов
  const parseCards = (text: string) => {
    return importStrategy.parseText(text, existingCards);
  };

  const handlePreview = () => {
    if (!inputText.trim()) {
      setParseResult({
        cards: [],
        errors: ['Введите текст для парсинга'],
        duplicates: [],
        newCards: [],
      });
      return;
    }

    const result = parseCards(inputText);
    setParseResult(result);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.newCards.length === 0) return;

    setIsImporting(true);
    try {
      const cardsToImport: CardFormData[] = parseResult.newCards.map(
        (card) => ({
          germanWord: card.germanWord,
          translation: card.translation,
          tagIds: Array.from(selectedTagIds), // Добавляем выбранные теги
          word_type: 'other', // Устанавливаем тип "other" для обычных карточек
        })
      );

      await onImport(cardsToImport);

      // Очистка после успешного импорта
      setInputText('');
      setParseResult(null);
      setShowPreview(false);
      setSelectedTagIds(new Set()); // Очищаем выбранные теги
      onClose();
    } catch (error) {
      console.error('Ошибка импорта:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setInputText('');
    setParseResult(null);
    setShowPreview(false);
    setSelectedTagIds(new Set()); // Очищаем выбранные теги
    onClose();
  };

  const gptPromptText = importStrategy.getGptPrompt();

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(gptPromptText);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  const formatExample = importStrategy.getFormatExample();

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Upload />
            Массовый импорт карточек
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Введите карточки по одной на строку в формате:
                &quot;немецкое_слово - русский_перевод&quot;
              </Typography>

              <Tooltip title="Получить промпт для GPT">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SmartToy />}
                  onClick={() => {
                    setIsGptPromptOpen(true);
                  }}
                  sx={{ minWidth: 'auto', flexShrink: 0 }}
                >
                  GPT промпт
                </Button>
              </Tooltip>
            </Box>

            <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}
              >
                {formatExample}
              </Typography>
            </Paper>
          </Box>

          <TextField
            label="Текст для импорта"
            multiline
            rows={8}
            fullWidth
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
            placeholder="das Haus - дом&#10;die Katze - кошка&#10;der Hund - собака"
            sx={{ mb: 2 }}
          />

          {/* Выбор тегов для массового импорта */}
          {availableTags.length > 0 && (
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
                  aria-controls="bulk-import-tags-content"
                  id="bulk-import-tags-header"
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
                    <LocalOffer />
                    <Typography fontWeight="500">
                      Теги для новых карточек
                    </Typography>
                    {selectedTagIds.size > 0 && (
                      <Box
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontWeight: 'bold',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                        }}
                      >
                        {selectedTagIds.size}
                      </Box>
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
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Выберите теги, которые будут добавлены ко всем
                      импортируемым карточкам:
                    </Typography>

                    <TagFilter
                      availableTags={availableTags}
                      selectedTagIds={selectedTagIds}
                      onTagToggle={handleTagToggle}
                      onSelectAllTags={handleSelectAllTags}
                      onClearTagSelection={handleClearTagSelection}
                      showStatsChip={false}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handlePreview}
              startIcon={<Preview />}
              disabled={!inputText.trim() || loadingExistingCards}
            >
              {loadingExistingCards
                ? 'Загрузка...'
                : 'Предварительный просмотр'}
            </Button>
          </Box>

          {/* Результаты парсинга */}
          {parseResult && showPreview && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />

              {/* Ошибки */}
              {parseResult.errors.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Найдены ошибки:
                  </Typography>
                  <List dense>
                    {parseResult.errors.map((error, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemText
                          primary={error}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}

              {/* Дубликаты */}
              {parseResult.duplicates.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Warning color="warning" />
                    <Typography variant="subtitle2">
                      Найдены дубликаты ({parseResult.duplicates.length}):
                    </Typography>
                  </Box>
                  <Paper
                    sx={{
                      maxHeight: 200,
                      overflow: 'auto',
                      p: 1,
                      bgcolor: 'warning.light',
                    }}
                  >
                    <List dense>
                      {parseResult.duplicates.map((card, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={`${card.germanWord} → ${card.translation}`}
                            secondary={`Строка ${card.lineNumber} - уже существует`}
                            sx={{
                              '& .MuiListItemText-primary': {
                                color: 'warning.dark',
                                fontWeight: 'bold',
                              },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Alert>
              )}

              {/* Успешно распарсенные карточки */}
              {parseResult.newCards.length > 0 && (
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" color="primary">
                      Будет добавлено карточек: {parseResult.newCards.length}
                    </Typography>

                    {selectedTagIds.size > 0 && (
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          с тегами:
                        </Typography>
                        <Box
                          sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                        >
                          {Array.from(selectedTagIds).map((tagId) => {
                            const tag = availableTags.find(
                              (t) => t.id === tagId
                            );
                            return tag ? (
                              <Box
                                key={tag.id}
                                sx={{
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: '8px',
                                  backgroundColor: tag.color + '20',
                                  border: `1px solid ${tag.color}`,
                                  color: tag.color,
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                }}
                              >
                                {tag.name}
                              </Box>
                            ) : null;
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  <Paper sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
                    <List dense>
                      {parseResult.newCards.map((card, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={`${card.germanWord} → ${card.translation}`}
                            secondary={`Строка ${card.lineNumber}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {/* Статистика */}
              {parseResult.duplicates.length > 0 &&
                parseResult.newCards.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Статистика:</strong>{' '}
                        {parseResult.newCards.length} новых карточек,{' '}
                        {parseResult.duplicates.length} дубликатов пропущено
                      </Typography>
                    </Alert>
                  </Box>
                )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Отменить</Button>

          <Button
            variant="contained"
            onClick={() => {
              void handleImport();
            }}
            disabled={
              !parseResult || parseResult.newCards.length === 0 || isImporting
            }
            startIcon={
              isImporting ? <CircularProgress size={16} /> : <Upload />
            }
          >
            {isImporting
              ? 'Импорт...'
              : `Импортировать (${parseResult?.newCards.length ?? 0}${
                  selectedTagIds.size > 0
                    ? ` + ${selectedTagIds.size} тег${selectedTagIds.size === 1 ? '' : selectedTagIds.size < 5 ? 'а' : 'ов'}`
                    : ''
                })`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка с промптом для GPT */}
      <Dialog
        open={isGptPromptOpen}
        onClose={() => {
          setIsGptPromptOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <SmartToy />
              Промпт для GPT
            </Box>
            <IconButton
              onClick={() => {
                setIsGptPromptOpen(false);
              }}
              size="small"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Скопируйте этот текст и вставьте в ChatGPT, добавив в конце ваши
            русские слова:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2, position: 'relative' }}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {gptPromptText}
            </Typography>

            <Tooltip title={copySuccess ? 'Скопировано!' : 'Копировать'}>
              <IconButton
                onClick={() => {
                  void handleCopyPrompt();
                }}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: copySuccess ? 'success.main' : 'text.secondary',
                }}
                size="small"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Как использовать:</strong>
              <br />
              1. Скопируйте промпт
              <br />
              2. Откройте ChatGPT
              <br />
              3. Вставьте промпт и добавьте ваши русские слова
              <br />
              4. Скопируйте ответ GPT в поле импорта выше
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setIsGptPromptOpen(false);
            }}
          >
            Закрыть
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleCopyPrompt();
            }}
            startIcon={<ContentCopy />}
          >
            {copySuccess ? 'Скопировано!' : 'Копировать промпт'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
