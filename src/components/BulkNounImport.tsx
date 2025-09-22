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
  Chip,
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
import {
  NounBulkImportStrategy,
  type NounParseResult,
} from '@/strategies/NounBulkImportStrategy';

interface BulkNounImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (cards: CardFormData[]) => Promise<void>;
  availableTags?: Tag[];
}

export function BulkNounImport({
  open,
  onClose,
  onImport,
  availableTags = [],
}: BulkNounImportProps) {
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<NounParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGptPromptOpen, setIsGptPromptOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [existingCards, setExistingCards] = useState<Card[]>([]);
  const [loadingExistingCards, setLoadingExistingCards] = useState(false);

  // Состояние для выбора тегов
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Создаем экземпляр стратегии
  const importStrategy = new NounBulkImportStrategy();

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

    const result = importStrategy.parseText(inputText, existingCards);
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
          tagIds: Array.from(selectedTagIds),
          word_type: 'noun',
          base_form: card.base_form,
          grammar_data:
            card.article || card.plural
              ? {
                  article: card.article,
                  plural: card.plural,
                }
              : undefined,
        })
      );

      await onImport(cardsToImport);

      // Очистка после успешного импорта
      setInputText('');
      setParseResult(null);
      setShowPreview(false);
      setSelectedTagIds(new Set());
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
    setSelectedTagIds(new Set());
    onClose();
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(importStrategy.getGptPrompt());
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

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
            Массовый импорт существительных
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Введите существительные в формате: &quot;артикль слово, артикль
                множественное_число - русский_перевод&quot;
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
                {importStrategy.getFormatExample()}
              </Typography>
            </Paper>
          </Box>

          <TextField
            label="Текст для импорта существительных"
            multiline
            rows={8}
            fullWidth
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
            placeholder="der Mann, die Männer - мужчина&#10;die Frau, die Frauen - женщина&#10;das Kind, die Kinder - ребенок"
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
                  aria-controls="bulk-noun-import-tags-content"
                  id="bulk-noun-import-tags-header"
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
                      Теги для новых существительных
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
                      импортируемым существительным:
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
                      Будет добавлено существительных:{' '}
                      {parseResult.newCards.length}
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
                              <Chip
                                key={tag.id}
                                label={tag.name}
                                size="small"
                                sx={{
                                  backgroundColor: `${tag.color}20`,
                                  borderColor: tag.color,
                                  color: tag.color,
                                }}
                              />
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
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Строка {card.lineNumber}
                                </Typography>
                                {card.article && (
                                  <Chip
                                    label={`Артикль: ${card.article}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mr: 1, mt: 0.5 }}
                                  />
                                )}
                                {card.plural && (
                                  <Chip
                                    label={`Мн.ч.: ${card.plural}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mt: 0.5 }}
                                  />
                                )}
                              </Box>
                            }
                            secondaryTypographyProps={{ component: 'div' }}
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
                        {parseResult.newCards.length} новых существительных,{' '}
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
              : `Импортировать существительные (${parseResult?.newCards.length ?? 0}${
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
              Промпт для GPT - Существительные
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
            русские существительные:
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
              {importStrategy.getGptPrompt()}
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
              3. Вставьте промпт и добавьте ваши русские существительные
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
