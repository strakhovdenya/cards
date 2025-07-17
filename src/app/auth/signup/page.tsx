'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Typography, Alert } from '@mui/material';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useSearchParams } from 'next/navigation';

export default function SignUpPage() {
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
