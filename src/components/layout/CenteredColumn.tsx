import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { APP_COLUMN_MAX_WIDTH } from '@/constants/layout';

interface CenteredColumnProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function CenteredColumn({ children, sx }: CenteredColumnProps) {
  return (
    <Box sx={{ maxWidth: APP_COLUMN_MAX_WIDTH, mx: 'auto', width: '100%' }}>
      {sx ? <Box sx={sx}>{children}</Box> : children}
    </Box>
  );
}
