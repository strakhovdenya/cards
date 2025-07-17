'use client';

import { useState, useEffect } from 'react';
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
import { signUpWithEmail, validateInviteCode } from '@/lib/auth';
import NextLink from 'next/link';

interface SignUpFormProps {
  initialInviteCode?: string | null;
}

export function SignUpForm({ initialInviteCode }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    inviteCode: initialInviteCode ?? '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const router = useRouter();

  // Обновляем код приглашения при изменении initialInviteCode
  useEffect(() => {
    if (initialInviteCode && initialInviteCode !== formData.inviteCode) {
      setFormData((prev) => ({ ...prev, inviteCode: initialInviteCode }));
    }
  }, [initialInviteCode, formData.inviteCode]);

  // Проверяем инвайт-код при изменении
  useEffect(() => {
    const checkInviteCode = async () => {
      if (formData.inviteCode) {
        try {
          const isValid = await validateInviteCode(formData.inviteCode);
          setInviteValid(isValid);
        } catch {
          setInviteValid(false);
        }
      } else {
        setInviteValid(null);
      }
    };

    if (formData.inviteCode) {
      void checkInviteCode();
    }
  }, [formData.inviteCode]);

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setError(null);
    };

  const validateForm = () => {
    if (
      !formData.email.trim() ||
      !formData.password ||
      !formData.firstName.trim() ||
      !formData.lastName.trim()
    ) {
      setError('Пожалуйста, заполните все обязательные поля');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signUpWithEmail({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        inviteCode: formData.inviteCode || undefined,
      });

      // Успешная регистрация - перенаправляем на главную
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Имя"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            required
            autoComplete="given-name"
          />
          <TextField
            fullWidth
            label="Фамилия"
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            required
            autoComplete="family-name"
          />
        </Box>

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          margin="normal"
          required
          autoComplete="email"
        />

        <TextField
          fullWidth
          label="Пароль"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleInputChange('password')}
          margin="normal"
          required
          autoComplete="new-password"
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

        <TextField
          fullWidth
          label="Подтвердите пароль"
          type={showConfirmPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          margin="normal"
          required
          autoComplete="new-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password visibility"
                  onClick={() => {
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Код приглашения (если есть)"
          value={formData.inviteCode}
          onChange={handleInputChange('inviteCode')}
          margin="normal"
          autoComplete="off"
          error={inviteValid === false}
          helperText={
            inviteValid === false
              ? 'Неверный или истёкший код приглашения'
              : inviteValid === true
                ? 'Код приглашения действителен'
                : ''
          }
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
          disabled={loading || (!!formData.inviteCode && inviteValid === false)}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? 'Регистрация...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2">
            Уже есть аккаунт?{' '}
            <Link component={NextLink} href="/auth">
              Войти
            </Link>
          </Typography>
        </Box>
      </form>
    </Paper>
  );
}
