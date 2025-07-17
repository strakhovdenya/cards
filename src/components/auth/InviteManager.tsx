'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add, ContentCopy, Send } from '@mui/icons-material';
import { createInvite, getInvites, type Invite } from '@/lib/auth';

interface InviteManagerProps {
  userId: string;
}

export function InviteManager({ userId }: InviteManagerProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const loadInvites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getInvites(userId);
      const data = result.data;
      setInvites(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ошибка загрузки приглашений'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const handleCreateInvite = async () => {
    try {
      setCreating(true);
      setError(null);
      const result = await createInvite(newInviteEmail.trim() ?? '', userId);
      const data = result.data;

      if (data) {
        setInvites((prev) => [data, ...prev]);
        setSelectedInvite(data);
        setShowLinkDialog(true);
        setNewInviteEmail('');
        setSuccess('Приглашение создано успешно!');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ошибка создания приглашения'
      );
    } finally {
      setCreating(false);
    }
  };

  const getInviteUrl = (inviteCode: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/signup?invite=${inviteCode}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Ссылка скопирована в буфер обмена!');
    } catch {
      setError('Не удалось скопировать ссылку');
    }
  };

  const getStatusChip = (invite: Invite) => {
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    const isExpired = expiresAt < now;

    if (invite.used) {
      return <Chip label="Использован" color="success" size="small" />;
    } else if (isExpired) {
      return <Chip label="Истёк" color="error" size="small" />;
    } else {
      return <Chip label="Активен" color="primary" size="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Управление приглашениями
      </Typography>

      {/* Форма создания приглашения */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Создать новое приглашение
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="Email получателя (необязательно)"
            type="email"
            value={newInviteEmail}
            onChange={(e) => {
              setNewInviteEmail(e.target.value);
            }}
            placeholder="user@example.com"
            helperText="Оставьте пустым для создания универсального приглашения"
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              void handleCreateInvite();
            }}
            disabled={creating}
            sx={{ minWidth: 140 }}
          >
            {creating ? 'Создание...' : 'Создать'}
          </Button>
        </Box>
      </Paper>

      {/* Сообщения */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => {
            setError(null);
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => {
            setSuccess(null);
          }}
        >
          {success}
        </Alert>
      )}

      {/* Таблица приглашений */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Создано</TableCell>
                <TableCell>Истекает</TableCell>
                <TableCell>Использован</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Нет созданных приглашений
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      {invite.email ?? <em>Универсальное</em>}
                    </TableCell>
                    <TableCell>{getStatusChip(invite)}</TableCell>
                    <TableCell>{formatDate(invite.created_at)}</TableCell>
                    <TableCell>{formatDate(invite.expires_at)}</TableCell>
                    <TableCell>
                      {invite.used ? formatDate(invite.used_at!) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedInvite(invite);
                          setShowLinkDialog(true);
                        }}
                        disabled={
                          invite.used ||
                          new Date(invite.expires_at) < new Date()
                        }
                        title="Показать ссылку"
                      >
                        <Send />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          void copyToClipboard(
                            getInviteUrl(invite.invite_code)
                          );
                        }}
                        disabled={
                          invite.used ||
                          new Date(invite.expires_at) < new Date()
                        }
                        title="Скопировать ссылку"
                      >
                        <ContentCopy />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Диалог показа ссылки приглашения */}
      <Dialog
        open={showLinkDialog}
        onClose={() => {
          setShowLinkDialog(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ссылка приглашения</DialogTitle>
        <DialogContent>
          {selectedInvite && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Отправьте эту ссылку пользователю для регистрации:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={getInviteUrl(selectedInvite.invite_code)}
                variant="outlined"
                sx={{ mt: 2 }}
                InputProps={{
                  readOnly: true,
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Код: {selectedInvite.invite_code}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Действителен до: {formatDate(selectedInvite.expires_at)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowLinkDialog(false);
            }}
          >
            Закрыть
          </Button>
          <Button
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={() => {
              if (selectedInvite) {
                void copyToClipboard(getInviteUrl(selectedInvite.invite_code));
              }
            }}
          >
            Скопировать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
