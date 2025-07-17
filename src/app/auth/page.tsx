'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Typography, Alert } from '@mui/material';
import { AuthForm } from '@/components/auth/AuthForm';
import { checkIfAdminsExist } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';

export default function AuthPage() {
  const [showSignupLink, setShowSignupLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  const isBlocked = searchParams.get('blocked') === 'true';
  const isInvalid = searchParams.get('invalid') === 'true';

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const adminsExist = await checkIfAdminsExist();
        setShowSignupLink(!adminsExist);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setShowSignupLink(true); // В случае ошибки показываем ссылку
      } finally {
        setLoading(false);
      }
    };

    void checkAdminStatus();
  }, []);

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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            German Word Cards
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Войдите в свой аккаунт
          </Typography>
        </Box>

        {isBlocked && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Регистрация заблокирована. Требуется код приглашения.
          </Alert>
        )}

        {isInvalid && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Неверный или истёкший код приглашения.
          </Alert>
        )}

        <AuthForm showSignupLink={showSignupLink && !loading} />
      </Container>
    </Box>
  );
}
