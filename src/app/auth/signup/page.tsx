'use client';

import { useState, useEffect, Suspense } from 'react';
import { Box, Container, Typography, Alert } from '@mui/material';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useSearchParams } from 'next/navigation';

function SignUpPageContent() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get('invite');
    setInviteCode(invite);
  }, [searchParams]);

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
            Создайте свой аккаунт
          </Typography>
        </Box>

        {inviteCode && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Регистрация по приглашению
          </Alert>
        )}

        <SignUpForm initialInviteCode={inviteCode} />
      </Container>
    </Box>
  );
}

export default function SignUpPage() {
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
          <Container maxWidth="sm">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                German Word Cards
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Загрузка...
              </Typography>
            </Box>
          </Container>
        </Box>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}
