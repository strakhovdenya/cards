'use client';

import { useState, useEffect, Suspense } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { AuthForm } from '@/components/auth/AuthForm';
import { checkIfAdminsExist } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';
import { CenteredColumn } from '@/components/layout/CenteredColumn';

function AuthPageContent() {
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
      <CenteredColumn sx={{ px: 2 }}>
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
      </CenteredColumn>
    </Box>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CenteredColumn sx={{ px: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                German Word Cards
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Загрузка...
              </Typography>
            </Box>
          </CenteredColumn>
        </Box>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
