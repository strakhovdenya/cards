import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserLoadError } from './UserLoadError';

const DEFAULT_MESSAGE = 'Ошибка загрузки данных пользователя';

const renderScreen = (error: string | null = null) => {
  const onRetry = vi.fn();
  const onSignOut = vi.fn();
  render(
    <UserLoadError error={error} onRetry={onRetry} onSignOut={onSignOut} />
  );
  return { onRetry, onSignOut };
};

describe('UserLoadError', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows reason with retry and sign out actions', () => {
    renderScreen('Нет соединения');

    expect(screen.getByText('Нет соединения')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeTruthy();
  });

  it('retry triggers reload', async () => {
    const { onRetry, onSignOut } = renderScreen('Нет соединения');

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('sign out triggers sign out', async () => {
    const { onRetry, onSignOut } = renderScreen('Нет соединения');

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('falls back to default message', () => {
    renderScreen(null);

    expect(screen.getByText(DEFAULT_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
