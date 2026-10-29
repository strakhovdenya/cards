'use client';

import { Box, Button, Stack, Typography } from '@mui/material';

const DEFAULT_MESSAGE = 'Ошибка загрузки данных пользователя';

interface UserLoadErrorProps {
  error: string | null;
  onRetry: () => void;
  onSignOut: () => void;
}

export function UserLoadError({
  error,
  onRetry,
  onSignOut,
}: UserLoadErrorProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: 2,
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
        <Typography variant="h6" component="h1" align="center">
          {DEFAULT_MESSAGE}
        </Typography>
        {error && (
          <Typography
            role="alert"
            color="text.secondary"
            align="center"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {error}
          </Typography>
        )}
        <Button variant="contained" size="large" fullWidth onClick={onRetry}>
          Повторить
        </Button>
        <Button variant="outlined" size="large" fullWidth onClick={onSignOut}>
          Выйти
        </Button>
      </Stack>
    </Box>
  );
}
