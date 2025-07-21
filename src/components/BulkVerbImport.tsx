'use client';

import { useState } from 'react';
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
  ExpandMore,
} from '@mui/icons-material';
import type { VerbConjugation } from '@/types';

interface BulkVerbImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (verbs: CreateVerbData[]) => Promise<void>;
}

interface CreateVerbData {
  infinitive: string;
  translation: string;
  conjugations: VerbConjugation[];
}

interface ParsedVerb {
  infinitive: string;
  translation: string;
  conjugations: VerbConjugation[];
  lineNumber: number;
}

interface ParseResult {
  verbs: ParsedVerb[];
  errors: string[];
}

interface JsonVerbData {
  infinitive: string;
  translation: string;
  conjugations: Array<{
    person: string;
    form: string;
    translation: string;
  }>;
}

interface JsonResponse {
  verbs: JsonVerbData[];
}

export function BulkVerbImport({
  open,
  onClose,
  onImport,
}: BulkVerbImportProps) {
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGptPromptOpen, setIsGptPromptOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Парсинг текста в глаголы
  const parseVerbs = (text: string): ParseResult => {
    const verbs: ParsedVerb[] = [];
    const errors: string[] = [];

    // Заменяем все типы кавычек на стандартные двойные кавычки
    const normalizedText = text.replace(/[“”«»„‟❝❞＂]/g, '"');

    // Сначала пытаемся парсить как JSON
    if (normalizedText.trim().startsWith('{')) {
      let jsonData: JsonResponse;
      try {
        jsonData = JSON.parse(normalizedText) as JsonResponse;

        if (!jsonData.verbs || !Array.isArray(jsonData.verbs)) {
          errors.push('Неверный формат JSON: отсутствует массив "verbs"');
          return { verbs, errors };
        }

        jsonData.verbs.forEach((verbData: JsonVerbData, index: number) => {
          if (
            !verbData.infinitive ||
            !verbData.translation ||
            !verbData.conjugations
          ) {
            errors.push(
              `Глагол ${index + 1}: отсутствуют обязательные поля (infinitive, translation, conjugations)`
            );
            return;
          }

          if (!Array.isArray(verbData.conjugations)) {
            errors.push(
              `Глагол "${verbData.infinitive}": conjugations должно быть массивом`
            );
            return;
          }

          if (verbData.conjugations.length !== 6) {
            errors.push(
              `Глагол "${verbData.infinitive}": должно быть ровно 6 спряжений, найдено ${verbData.conjugations.length}`
            );
            return;
          }

          const validPersons = [
            'ich',
            'du',
            'er/sie/es',
            'wir',
            'ihr',
            'sie / Sie',
          ];
          const foundPersons = new Set<string>();

          for (const conjugation of verbData.conjugations) {
            if (
              !conjugation.person ||
              !conjugation.form ||
              !conjugation.translation
            ) {
              errors.push(
                `Глагол "${verbData.infinitive}": неполные данные спряжения`
              );
              return;
            }

            if (!validPersons.includes(conjugation.person)) {
              errors.push(
                `Глагол "${verbData.infinitive}": неверная форма спряжения "${conjugation.person}"`
              );
              return;
            }

            if (foundPersons.has(conjugation.person)) {
              errors.push(
                `Глагол "${verbData.infinitive}": дублирование формы "${conjugation.person}"`
              );
              return;
            }

            foundPersons.add(conjugation.person);
          }

          verbs.push({
            infinitive: verbData.infinitive,
            translation: verbData.translation,
            conjugations: verbData.conjugations,
            lineNumber: index + 1,
          });
        });

        return { verbs, errors };
      } catch (error) {
        errors.push(
          `Ошибка парсинга JSON: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        );
        // Если JSON не парсится, продолжаем с текстовым парсером
      }
    }

    // Парсим как текстовый формат (для обратной совместимости)
    const lines = text.split('\n');
    let currentVerb: Partial<ParsedVerb> | null = null;
    let lineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      lineNumber = i + 1;

      // Пропускаем пустые строки
      if (!line) continue;

      // Проверяем, является ли строка инфинитивом (содержит перевод)
      if (line.includes(' - ')) {
        // Если есть предыдущий глагол без спряжений, добавляем ошибку
        if (
          currentVerb &&
          (!currentVerb.conjugations || currentVerb.conjugations.length === 0)
        ) {
          errors.push(
            `Строка ${lineNumber - 1}: глагол "${currentVerb.infinitive}" не имеет спряжений`
          );
        }

        // Начинаем новый глагол
        const separatorIndex = line.indexOf(' - ');
        const infinitive = line.substring(0, separatorIndex).trim();
        const translation = line.substring(separatorIndex + 3).trim();

        if (!infinitive) {
          errors.push(`Строка ${lineNumber}: пустой инфинитив`);
          continue;
        }

        if (!translation) {
          errors.push(`Строка ${lineNumber}: пустой перевод`);
          continue;
        }

        currentVerb = {
          infinitive,
          translation,
          conjugations: [],
          lineNumber,
        };
      } else {
        // Это строка со спряжением
        if (!currentVerb) {
          errors.push(`Строка ${lineNumber}: спряжение без инфинитива`);
          continue;
        }

        // Парсим спряжение в формате "ich - arbeite - я работаю"
        const parts = line.split(' - ');
        if (parts.length !== 3) {
          errors.push(
            `Строка ${lineNumber}: неверный формат спряжения. Ожидается: "person - form - translation"`
          );
          continue;
        }

        const person = parts[0].trim();
        const form = parts[1].trim();
        const conjugationTranslation = parts[2].trim();

        if (!person || !form || !conjugationTranslation) {
          errors.push(`Строка ${lineNumber}: неполные данные спряжения`);
          continue;
        }

        // Проверяем, что это валидная форма спряжения
        const validPersons = [
          'ich',
          'du',
          'er/sie/es',
          'wir',
          'ihr',
          'sie / Sie',
        ];
        if (!validPersons.includes(person)) {
          errors.push(
            `Строка ${lineNumber}: неверная форма спряжения "${person}"`
          );
          continue;
        }

        // Проверяем, что эта форма еще не добавлена
        const existingPerson = currentVerb.conjugations?.find(
          (c) => c.person === person
        );
        if (existingPerson) {
          errors.push(
            `Строка ${lineNumber}: дублирование формы "${person}" для глагола "${currentVerb.infinitive}"`
          );
          continue;
        }

        currentVerb.conjugations!.push({
          person,
          form,
          translation: conjugationTranslation,
        });
      }
    }

    // Проверяем последний глагол
    if (currentVerb) {
      if (!currentVerb.conjugations || currentVerb.conjugations.length === 0) {
        errors.push(`Глагол "${currentVerb.infinitive}" не имеет спряжений`);
      } else if (currentVerb.conjugations.length !== 6) {
        errors.push(
          `Глагол "${currentVerb.infinitive}" имеет ${currentVerb.conjugations.length} спряжений вместо 6`
        );
      } else {
        verbs.push(currentVerb as ParsedVerb);
      }
    }

    return { verbs, errors };
  };

  const handlePreview = () => {
    if (!inputText.trim()) {
      setParseResult({ verbs: [], errors: ['Введите текст для парсинга'] });
      return;
    }

    const result = parseVerbs(inputText);
    setParseResult(result);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.verbs.length === 0) return;

    setIsImporting(true);
    try {
      const verbsToImport: CreateVerbData[] = parseResult.verbs.map((verb) => ({
        infinitive: verb.infinitive,
        translation: verb.translation,
        conjugations: verb.conjugations,
      }));

      await onImport(verbsToImport);

      // Очистка после успешного импорта
      setInputText('');
      setParseResult(null);
      setShowPreview(false);
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
    onClose();
  };

  const gptPromptText = `## КРИТИЧЕСКИ ВАЖНО

Ты ДОЛЖЕН отвечать ТОЛЬКО в JSON формате. НЕ используй:
- Списки
- Текстовые описания  
- Разделители типа "-" или "→"
- Дополнительные комментарии
- Объяснения

ТОЛЬКО валидный JSON объект!

## Инструкция

Ты - эксперт по немецкому языку. Создай список немецких глаголов с их спряжениями в строгом JSON формате для импорта в базу данных.

## Формат ответа

Отвечай ТОЛЬКО в следующем JSON формате, без дополнительного текста:

{
  "verbs": [
    {
      "infinitive": "немецкий_инфинитив",
      "translation": "русский_перевод",
      "conjugations": [
        {
          "person": "ich",
          "form": "форма_для_ich",
          "translation": "перевод_для_ich"
        },
        {
          "person": "du", 
          "form": "форма_для_du",
          "translation": "перевод_для_du"
        },
        {
          "person": "er/sie/es",
          "form": "форма_для_er_sie_es", 
          "translation": "перевод_для_er_sie_es"
        },
        {
          "person": "wir",
          "form": "форма_для_wir",
          "translation": "перевод_для_wir"
        },
        {
          "person": "ihr",
          "form": "форма_для_ihr",
          "translation": "перевод_для_ihr"
        },
        {
          "person": "sie / Sie",
          "form": "форма_для_sie_Sie",
          "translation": "перевод_для_sie_Sie"
        }
      ]
    }
  ]
}

## НЕПРАВИЛЬНЫЕ форматы (НЕ используй):

❌ Список:
heißen - называться
ich - heiße - я называюсь

❌ Текст с разделителями:
arbeiten → ich arbeite → я работаю

❌ Простой список:
sein, haben, machen, lernen

## Правильный формат (ИСПОЛЬЗУЙ):

✅ ТОЛЬКО JSON:
{
  "verbs": [
    {
      "infinitive": "heißen",
      "translation": "называться", 
      "conjugations": [
        {
          "person": "ich",
          "form": "heiße", 
          "translation": "я называюсь"
        }
      ]
    }
  ]
}

## ФИНАЛЬНОЕ ПРЕДУПРЕЖДЕНИЕ

⚠️ **ВАЖНО**: Твой ответ ДОЛЖЕН начинаться с \`{\` и заканчиваться на \`}\`. 
⚠️ НЕ добавляй никакого текста до или после JSON.
⚠️ НЕ используй markdown разметку.
⚠️ НЕ добавляй комментарии типа "Вот JSON:" или "Ответ:".
⚠️ ТОЛЬКО чистый JSON объект!

## Запрос

Сгенерируй немецких глаголы из русских в указанном формате. 
Вот список: [СПИСОК_РУССКИХ_ГЛАГОЛОВ]`;

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

  const formatExample = `Поддерживаемые форматы:

1. Текстовый формат:
arbeiten - работать
ich - arbeite - я работаю
du - arbeitest - ты работаешь
er/sie/es - arbeitet - он работает
wir - arbeiten - мы работаем
ihr - arbeitet - вы работаете
sie / Sie - arbeiten - они работают

2. JSON формат (рекомендуется):
{
  "verbs": [
    {
      "infinitive": "arbeiten",
      "translation": "работать",
      "conjugations": [
        {
          "person": "ich",
          "form": "arbeite",
          "translation": "я работаю"
        },
        {
          "person": "du",
          "form": "arbeitest", 
          "translation": "ты работаешь"
        }
      ]
    }
  ]
}`;

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
            Массовый импорт глаголов
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Введите глаголы в текстовом формате или JSON (рекомендуется)
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
                component="pre"
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {formatExample}
              </Typography>
            </Paper>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={12}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
            placeholder="Введите глаголы здесь..."
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Preview />}
              onClick={handlePreview}
              disabled={!inputText.trim()}
            >
              Предварительный просмотр
            </Button>
          </Box>

          {parseResult && (
            <Box sx={{ mt: 2 }}>
              {parseResult.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Найдено {parseResult.errors.length} ошибок:
                  </Typography>
                  <List dense>
                    {parseResult.errors.map((error, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}

              {parseResult.verbs.length > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Найдено {parseResult.verbs.length} глаголов для импорта
                </Alert>
              )}

              {showPreview && parseResult.verbs.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>
                      Предварительный просмотр ({parseResult.verbs.length}{' '}
                      глаголов)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {parseResult.verbs.map((verb, index) => (
                        <Box key={index}>
                          <ListItem>
                            <ListItemText
                              primary={`${verb.infinitive} - ${verb.translation}`}
                              secondary={`Строка ${verb.lineNumber}`}
                            />
                          </ListItem>
                          <Box sx={{ ml: 2 }}>
                            {verb.conjugations.map((conjugation, conjIndex) => (
                              <ListItem key={conjIndex} dense>
                                <ListItemText
                                  primary={`${conjugation.person} - ${conjugation.form} - ${conjugation.translation}`}
                                />
                              </ListItem>
                            ))}
                          </Box>
                          {index < parseResult.verbs.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button
            onClick={() => {
              void handleImport();
            }}
            variant="contained"
            disabled={
              !parseResult ||
              parseResult.verbs.length === 0 ||
              parseResult.errors.length > 0 ||
              isImporting
            }
            startIcon={
              isImporting ? <CircularProgress size={16} /> : <Upload />
            }
          >
            {isImporting ? 'Импорт...' : 'Импортировать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог с промптом для GPT */}
      <Dialog
        open={isGptPromptOpen}
        onClose={() => {
          setIsGptPromptOpen(false);
        }}
        maxWidth="md"
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
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Скопируйте этот промпт и отправьте его в GPT вместе со списком
            русских глаголов:
          </Typography>

          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {gptPromptText}
            </Typography>
          </Paper>
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
            onClick={() => {
              void handleCopyPrompt();
            }}
            variant="contained"
            startIcon={copySuccess ? <ContentCopy /> : <ContentCopy />}
          >
            {copySuccess ? 'Скопировано!' : 'Копировать промпт'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
