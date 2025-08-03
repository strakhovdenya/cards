'use client';

import { useState } from 'react';
import { Button, Box, Typography, Alert } from '@mui/material';
import { VolumeUp } from '@mui/icons-material';
import { useSpeech } from '@/services/speechService';

export function SpeechTest() {
  const { speak, isSupported } = useSpeech();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleTest = async () => {
    setIsSpeaking(true);
    try {
      await speak('Hallo, wie geht es dir?', {
        lang: 'de-DE',
        rate: 0.8,
      });
    } catch (error) {
      console.error('Speech test error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (!isSupported()) {
    return (
      <Alert severity="warning">Ваш браузер не поддерживает синтез речи</Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Тест произношения
      </Typography>
      <Button
        variant="contained"
        startIcon={<VolumeUp />}
        onClick={() => {
          void handleTest();
        }}
        disabled={isSpeaking}
      >
        {isSpeaking
          ? 'Произносится...'
          : 'Произнести "Hallo, wie geht es dir?"'}
      </Button>
    </Box>
  );
}
