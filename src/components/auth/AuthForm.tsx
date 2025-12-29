'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { signInWithEmail } from '@/lib/auth';
import NextLink from 'next/link';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface AuthFormProps {
  showSignupLink?: boolean;
}

export function AuthForm({ showSignupLink = false }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmail(email.trim(), password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          margin="normal"
          required
          autoComplete="email"
        />

        <TextField
          fullWidth
          label="Пароль"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          margin="normal"
          required
          autoComplete="current-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => {
                    setShowPassword(!showPassword);
                  }}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ mt: 3, mb: 1 }}
        >
          {loading ? 'Входим...' : 'Войти'}
        </Button>

        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Button
            size="small"
            onClick={() => {
              setResetDialogOpen(true);
            }}
          >
            Забыли пароль?
          </Button>
        </Box>

        {showSignupLink && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2">
              Нет аккаунта?{' '}
              <Link component={NextLink} href="/auth/signup">
                Зарегистрироваться
              </Link>
            </Typography>
          </Box>
        )}
      </form>

      <ForgotPasswordDialog
        open={resetDialogOpen}
        onClose={() => {
          setResetDialogOpen(false);
        }}
        initialEmail={email}
      />
    </Paper>
  );
}
