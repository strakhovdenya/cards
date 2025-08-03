'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Settings, VolumeUp } from '@mui/icons-material';
import { useSpeech } from '@/services/speechService';

interface SpeechSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface SpeechSettings {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  enabled: boolean;
  lang?: string;
}

export function SpeechSettings({ open, onClose }: SpeechSettingsProps) {
  const { speak, isSupported, getAvailableVoices } = useSpeech();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<SpeechSettings>({
    voice: '',
    rate: 0.8,
    pitch: 1.0,
    volume: 1.0,
    enabled: true,
  });
  const [testText] = useState('Hallo, wie geht es dir?');

  useEffect(() => {
    if (!open) return; // Не загружаем голоса, если диалог закрыт

    const loadVoices = async () => {
      if (isSupported()) {
        try {
          const availableVoices = await getAvailableVoices();
          setVoices(availableVoices);

          // Выбираем немецкий голос по умолчанию
          const germanVoice = availableVoices.find(
            (voice: SpeechSynthesisVoice) =>
              voice.lang.startsWith('de') ||
              voice.name.toLowerCase().includes('german')
          );

          if (germanVoice) {
            setSettings((prev) => ({ ...prev, voice: germanVoice.name }));
          } else if (availableVoices.length > 0) {
            setSettings((prev) => ({
              ...prev,
              voice: availableVoices[0].name,
            }));
          }
        } catch (error) {
          console.error('Error loading voices:', error);
        }
      }
    };

    void loadVoices();
  }, [open, isSupported, getAvailableVoices]);

  const handleSettingChange = (
    key: keyof SpeechSettings,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    if (!isSupported()) return;

    setTestError(null);
    setIsTesting(true);

    try {
      const selectedVoice = voices.find((v) => v.name === settings.voice);
      await speak(testText, {
        lang: selectedVoice?.lang ?? 'de-DE',
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
        voice: settings.voice,
      });
    } catch (error) {
      console.error('Test speech error:', error);
      setTestError(
        error instanceof Error ? error.message : 'Ошибка произношения'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    // Сохраняем настройки в localStorage
    localStorage.setItem('speechSettings', JSON.stringify(settings));
    onClose();
  };

  if (!isSupported()) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <VolumeUp />
            Настройки произношения
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Ваш браузер не поддерживает синтез речи. Функция произношения
            недоступна.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          Настройки произношения
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Включение/выключение */}
          <FormControlLabel
            control={
              <Switch
                checked={settings.enabled}
                onChange={(e) =>
                  { handleSettingChange('enabled', e.target.checked); }
                }
              />
            }
            label="Включить произношение"
            sx={{ mb: 3 }}
          />

          {/* Выбор голоса */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Голос</InputLabel>
            <Select
              value={settings.voice}
              onChange={(e) => { handleSettingChange('voice', e.target.value); }}
              label="Голос"
            >
              {voices.map((voice) => (
                <MenuItem key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </MenuItem>
              ))}
            </Select>
            {voices.length === 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Загрузка доступных голосов...
              </Typography>
            )}
          </FormControl>

          {/* Скорость */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Скорость: {settings.rate.toFixed(1)}x
            </Typography>
            <Slider
              value={settings.rate}
              onChange={(_, value) => { handleSettingChange('rate', value); }}
              min={0.5}
              max={2.0}
              step={0.1}
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1.0, label: '1.0x' },
                { value: 2.0, label: '2.0x' },
              ]}
            />
          </Box>

          {/* Высота тона */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Высота тона: {settings.pitch.toFixed(1)}
            </Typography>
            <Slider
              value={settings.pitch}
              onChange={(_, value) => { handleSettingChange('pitch', value); }}
              min={0.5}
              max={2.0}
              step={0.1}
              marks={[
                { value: 0.5, label: 'Низкий' },
                { value: 1.0, label: 'Нормальный' },
                { value: 2.0, label: 'Высокий' },
              ]}
            />
          </Box>

          {/* Громкость */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Громкость: {Math.round(settings.volume * 100)}%
            </Typography>
            <Slider
              value={settings.volume}
              onChange={(_, value) => { handleSettingChange('volume', value); }}
              min={0.1}
              max={1.0}
              step={0.1}
              marks={[
                { value: 0.1, label: '10%' },
                { value: 0.5, label: '50%' },
                { value: 1.0, label: '100%' },
              ]}
            />
          </Box>

          {/* Кнопка тестирования */}
          <Button
            variant="outlined"
            startIcon={<VolumeUp />}
            onClick={() => {
              void handleTest();
            }}
            disabled={isTesting}
            fullWidth
            sx={{ mb: 2 }}
          >
            {isTesting ? 'Тестирование...' : 'Протестировать настройки'}
          </Button>

          {/* Отображение ошибки тестирования */}
          {testError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {testError}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Настройки сохраняются автоматически и применяются ко всем карточкам.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleSave} variant="contained">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
