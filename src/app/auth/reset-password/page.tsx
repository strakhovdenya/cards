'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { updatePassword } from '@/lib/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          'Ссылка недействительна или устарела. Запросите новое письмо для восстановления.'
        );
      }

      setSessionChecked(true);
    };

    void checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Введите новый пароль и подтверждение.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updatePassword(password);
      setSuccess('Пароль обновлен. Сейчас вернемся на страницу входа...');
      setTimeout(() => {
        router.push('/auth');
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось обновить пароль. Попробуйте еще раз.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || !!error || !sessionChecked;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 3,
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Сброс пароля
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Придумайте новый пароль для вашей учетной записи.
          </Typography>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <TextField
              fullWidth
              label="Новый пароль"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              margin="normal"
              autoComplete="new-password"
              disabled={isFormDisabled}
            />

            <TextField
              fullWidth
              label="Подтверждение пароля"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
              margin="normal"
              autoComplete="new-password"
              disabled={isFormDisabled}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isFormDisabled}
              sx={{ mt: 3 }}
            >
              {loading ? 'Сохраняем...' : 'Сохранить новый пароль'}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
