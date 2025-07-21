'use client';

import { useState, useCallback } from 'react';
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
} from '@mui/icons-material';
import type { CardFormData, Tag } from '@/types';
import { TagFilter } from './TagFilter';

interface BulkImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (cards: CardFormData[]) => Promise<void>;
  availableTags?: Tag[]; // Доступные теги для выбора
}

interface ParsedCard {
  germanWord: string;
  translation: string;
  lineNumber: number;
}

interface ParseResult {
  cards: ParsedCard[];
  errors: string[];
}

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

  // Состояние для выбора тегов
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

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

  // Парсинг текста в карточки
  const parseCards = (text: string): ParseResult => {
    const lines = text.split('\n');
    const cards: ParsedCard[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      let trimmedLine = line.trim();
      // Заменяем все виды дефисов на обычный дефис
      trimmedLine = trimmedLine.replace(/[‐‑‒–—−﹘﹣－]/g, '-');

      const lineNumber = index + 1;

      // Пропускаем пустые строки
      if (!trimmedLine) return;

      // Ищем разделитель " - "
      const separatorIndex = trimmedLine.indexOf(' - ');

      if (separatorIndex === -1) {
        errors.push(`Строка ${lineNumber}: не найден разделитель " - "`);
        return;
      }

      const germanWord = trimmedLine.substring(0, separatorIndex).trim();
      const translation = trimmedLine.substring(separatorIndex + 3).trim();

      if (!germanWord) {
        errors.push(`Строка ${lineNumber}: пустое немецкое слово`);
        return;
      }

      if (!translation) {
        errors.push(`Строка ${lineNumber}: пустой перевод`);
        return;
      }

      cards.push({
        germanWord,
        translation,
        lineNumber,
      });
    });

    return { cards, errors };
  };

  const handlePreview = () => {
    if (!inputText.trim()) {
      setParseResult({ cards: [], errors: ['Введите текст для парсинга'] });
      return;
    }

    const result = parseCards(inputText);
    setParseResult(result);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.cards.length === 0) return;

    setIsImporting(true);
    try {
      const cardsToImport: CardFormData[] = parseResult.cards.map((card) => ({
        germanWord: card.germanWord,
        translation: card.translation,
        tagIds: Array.from(selectedTagIds), // Добавляем выбранные теги
      }));

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

  const gptPromptText = `мне надо следующие слова перевести на немецкий, ответ дать в формате
die Lampe, die Lampen - Лампа
die Tasche, die Taschen - Сумка
в ответе не должно быть пустых строк между строк ответов

вот слова на русском языке`;

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

  const formatExample = `Пример формата:
das Haus - дом
die Katze - кошка
der Hund - собака
laufen - бегать`;

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
              disabled={!inputText.trim()}
            >
              Предварительный просмотр
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

              {/* Успешно распарсенные карточки */}
              {parseResult.cards.length > 0 && (
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
                      Будет добавлено карточек: {parseResult.cards.length}
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
                      {parseResult.cards.map((card, index) => (
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
              !parseResult || parseResult.cards.length === 0 || isImporting
            }
            startIcon={
              isImporting ? <CircularProgress size={16} /> : <Upload />
            }
          >
            {isImporting
              ? 'Импорт...'
              : `Импортировать (${parseResult?.cards.length ?? 0}${
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
