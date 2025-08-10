'use client';

import React from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';

export type FrontSide = 'german' | 'russian';

interface FrontSideToggleProps {
  value: FrontSide;
  onChange: (value: FrontSide) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  tooltip?: string;
}

export const FrontSideToggle: React.FC<FrontSideToggleProps> = ({
  value,
  onChange,
  size = 'small',
  disabled = false,
  tooltip = 'Выберите какую сторону показывать первой',
}) => {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: FrontSide | null
  ) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Tooltip title={tooltip}>
        <ToggleButtonGroup
          value={value}
          exclusive
          onChange={handleChange}
          size={size}
          color="primary"
          disabled={disabled}
          sx={{ height: size === 'small' ? '32px' : '40px' }}
        >
          <ToggleButton
            value="german"
            sx={{
              px: 1.5,
              fontSize: size === 'small' ? '0.75rem' : '0.875rem',
            }}
          >
            de → ru
          </ToggleButton>
          <ToggleButton
            value="russian"
            sx={{
              px: 1.5,
              fontSize: size === 'small' ? '0.75rem' : '0.875rem',
            }}
          >
            ru → de
          </ToggleButton>
        </ToggleButtonGroup>
      </Tooltip>
    </Box>
  );
};
