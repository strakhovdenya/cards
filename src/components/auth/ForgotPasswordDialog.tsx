'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { requestPasswordReset } from '@/lib/auth';

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordDialog({
  open,
  onClose,
  initialEmail = '',
}: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Введите email, чтобы отправить ссылку для сброса пароля.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await requestPasswordReset(email.trim());
      setSuccess('Письмо для восстановления отправлено. Проверьте почту.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось отправить письмо для восстановления.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <DialogTitle>Забыли пароль?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Укажите email учетной записи, и мы отправим письмо со ссылкой для
              смены пароля.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              autoComplete="email"
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Отправляем...' : 'Отправить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
