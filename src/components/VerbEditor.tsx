'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Fab,
  InputAdornment,
  Paper,
} from '@mui/material';
import { Add, Edit, Delete, Search, Clear } from '@mui/icons-material';
import type { Verb } from '@/types';
import {
  getVerbs,
  createVerb,
  updateVerb,
  deleteVerb,
} from '@/services/verbService';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface VerbEditorProps {
  // Компонент больше не принимает onTrainingMode
}

export const VerbEditor: React.FC<VerbEditorProps> = () => {
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<Verb | null>(null);
  const [searchText, setSearchText] = useState('');
  const [formData, setFormData] = useState({
    infinitive: '',
    translation: '',
    conjugations: [
      { person: 'ich', form: '', translation: '' },
      { person: 'du', form: '', translation: '' },
      { person: 'er/sie/es', form: '', translation: '' },
      { person: 'wir', form: '', translation: '' },
      { person: 'ihr', form: '', translation: '' },
      { person: 'sie / Sie', form: '', translation: '' },
    ],
  });

  useEffect(() => {
    void loadVerbs();
  }, []);

  const loadVerbs = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedVerbs = await getVerbs();
      setVerbs(fetchedVerbs);
    } catch (error) {
      console.error('Error loading verbs:', error);
      setError('Ошибка загрузки глаголов');
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация глаголов по всем формам
  const filteredVerbs = useMemo(() => {
    if (!searchText.trim()) {
      return verbs;
    }

    const searchLower = searchText.toLowerCase().trim();

    return verbs.filter((verb) => {
      // Поиск по инфинитиву
      if (verb.infinitive.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Поиск по переводу
      if (verb.translation.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Поиск по спряжениям
      if (verb.conjugations) {
        return verb.conjugations.some((conjugation) => {
          return (
            conjugation.form.toLowerCase().includes(searchLower) ||
            conjugation.translation.toLowerCase().includes(searchLower)
          );
        });
      }

      return false;
    });
  }, [verbs, searchText]);

  const handleOpenDialog = (verb?: Verb) => {
    if (verb) {
      setEditingVerb(verb);
      setFormData({
        infinitive: verb.infinitive,
        translation: verb.translation,
        conjugations: verb.conjugations || [],
      });
    } else {
      setEditingVerb(null);
      setFormData({
        infinitive: '',
        translation: '',
        conjugations: [
          { person: 'ich', form: '', translation: '' },
          { person: 'du', form: '', translation: '' },
          { person: 'er/sie/es', form: '', translation: '' },
          { person: 'wir', form: '', translation: '' },
          { person: 'ihr', form: '', translation: '' },
          { person: 'sie / Sie', form: '', translation: '' },
        ],
      });
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVerb(null);
    setFormData({
      infinitive: '',
      translation: '',
      conjugations: [
        { person: 'ich', form: '', translation: '' },
        { person: 'du', form: '', translation: '' },
        { person: 'er/sie/es', form: '', translation: '' },
        { person: 'wir', form: '', translation: '' },
        { person: 'ihr', form: '', translation: '' },
        { person: 'sie / Sie', form: '', translation: '' },
      ],
    });
    setError(null);
  };

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConjugationChange = (
    index: number,
    field: keyof (typeof formData.conjugations)[0],
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      conjugations: prev.conjugations.map((conj, i) =>
        i === index ? { ...conj, [field]: value } : conj
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.infinitive.trim() || !formData.translation.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      setError(null);
      if (editingVerb) {
        const updatedVerb = await updateVerb(editingVerb.id, formData);
        setVerbs((prev) =>
          prev.map((v) => (v.id === editingVerb.id ? updatedVerb : v))
        );
      } else {
        const newVerb = await createVerb(formData);
        setVerbs((prev) => [newVerb, ...prev]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving verb:', error);
      setError('Ошибка сохранения глагола');
    }
  };

  const handleDeleteVerb = async (id: string) => {
    if (!window.confirm('Удалить этот глагол?')) return;

    try {
      await deleteVerb(id);
      setVerbs((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Error deleting verb:', error);
      setError('Ошибка удаления глагола');
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Сообщения об ошибках */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Поле фильтрации */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Поиск по всем формам глагола (немецкий, русский, спряжения)..."
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
        {searchText && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Найдено: {filteredVerbs.length} из {verbs.length} глаголов
          </Typography>
        )}
      </Paper>

      {/* Просмотр глаголов */}
      {filteredVerbs.length === 0 ? (
        <Box textAlign="center" p={3}>
          <Typography variant="h6" color="text.secondary">
            {verbs.length === 0
              ? 'Нет добавленных глаголов'
              : 'Глаголы не найдены'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {verbs.length === 0
              ? 'Добавьте первый глагол для изучения'
              : 'Попробуйте изменить критерии поиска'}
          </Typography>
          {verbs.length === 0 && (
            <Box
              sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}
            >
              <Button
                variant="contained"
                onClick={() => {
                  handleOpenDialog();
                }}
              >
                Добавить первый глагол
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <>
          <List>
            {filteredVerbs.map((verb) => (
              <ListItem key={verb.id} divider>
                <ListItemText
                  primary={verb.infinitive}
                  secondary={verb.translation}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => {
                      handleOpenDialog(verb);
                    }}
                    sx={{ mr: 1 }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => {
                      void handleDeleteVerb(verb.id);
                    }}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Кнопка добавления */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => {
          handleOpenDialog();
        }}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Add />
      </Fab>

      {/* Диалог добавления/редактирования */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingVerb ? 'Редактировать глагол' : 'Добавить глагол'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Инфинитив"
              value={formData.infinitive}
              onChange={(e) => {
                handleFormChange('infinitive', e.target.value);
              }}
              fullWidth
            />
            <TextField
              label="Перевод"
              value={formData.translation}
              onChange={(e) => {
                handleFormChange('translation', e.target.value);
              }}
              fullWidth
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
              Спряжения
            </Typography>

            {formData.conjugations.map((conjugation, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                <Typography variant="subtitle2" color="primary">
                  {conjugation.person}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Форма"
                    value={conjugation.form}
                    onChange={(e) => {
                      handleConjugationChange(index, 'form', e.target.value);
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Перевод"
                    value={conjugation.translation}
                    onChange={(e) => {
                      handleConjugationChange(
                        index,
                        'translation',
                        e.target.value
                      );
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button
            onClick={() => {
              void handleSubmit();
            }}
            variant="contained"
          >
            {editingVerb ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
