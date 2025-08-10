'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { VolumeUp } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useSpeech } from '@/services/speechService';

const StyledSpeechButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(4px)',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease-in-out',
  zIndex: 10,
}));

interface SpeechButtonProps {
  text: string;
  tooltip?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  enableHotkey?: boolean; // Новый проп для включения горячей клавиши
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({
  text,
  tooltip = 'Произнести слово',
  size = 'small',
  color,
  disabled = false,
  onClick,
  enableHotkey = false, // По умолчанию отключено
}) => {
  const { speak, isSupported } = useSpeech();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(
    async (event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation(); // Предотвращаем всплытие события
      }

      if (onClick) {
        onClick(event!);
        return;
      }

      if (!isSupported()) {
        console.warn('Speech synthesis is not supported');
        return;
      }

      if (!text.trim()) {
        return;
      }

      setIsSpeaking(true);
      try {
        await speak(text, {
          lang: 'de-DE',
          rate: 0.8, // Немного медленнее для лучшего понимания
        });
      } catch (error) {
        console.error('Speech error:', error);
      } finally {
        setIsSpeaking(false);
      }
    },
    [speak, isSupported, text, onClick]
  );

  // Обработка горячей клавиши P для произношения
  useEffect(() => {
    if (!enableHotkey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        void handleSpeak();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSpeak, enableHotkey]);

  if (!isSupported()) {
    return null;
  }

  return (
    <Tooltip title={tooltip}>
      <StyledSpeechButton
        size={size}
        onClick={(event) => {
          void handleSpeak(event);
        }}
        disabled={disabled || isSpeaking}
        sx={{
          color: isSpeaking ? 'text.disabled' : (color ?? 'primary.main'),
        }}
      >
        <VolumeUp fontSize={size} />
      </StyledSpeechButton>
    </Tooltip>
  );
};
