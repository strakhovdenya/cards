import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  isAdmin: vi.fn(),
  push: vi.fn(),
  router: {} as { push: unknown },
  apiRequest: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  signOut: mocks.signOut,
  isAdmin: mocks.isAdmin,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}));
vi.mock('@/services/apiResponse', () => ({
  apiRequest: mocks.apiRequest,
}));

mocks.router.push = mocks.push;

const makeSession = (id: string) => ({
  user: { id },
  profile: { id, role: 'user' },
});

// Модульное состояние (кэш тегов и id пользователя) свежее в каждом тесте
const setup = async () => {
  vi.resetModules();
  const { useAuth } = await import('./useAuth');
  const { ClientTagService } = await import('@/services/tagService');
  return { useAuth, ClientTagService };
};

describe('useAuth tag cache', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.getCurrentUser.mockResolvedValue(makeSession('user-1'));
    mocks.signOut.mockResolvedValue(undefined);
    mocks.isAdmin.mockResolvedValue(false);
    mocks.apiRequest.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('sign out clears tag cache', async () => {
    const { useAuth, ClientTagService } = await setup();
    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.handleSignOut();
    });
    await ClientTagService.getTags();

    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });

  it('user change clears tag cache', async () => {
    const { useAuth, ClientTagService } = await setup();
    const first = renderHook(() => useAuth());
    await waitFor(() => {
      expect(first.result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();

    mocks.getCurrentUser.mockResolvedValue(makeSession('user-2'));
    const second = renderHook(() => useAuth());
    await waitFor(() => {
      expect(second.result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();

    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });

  it('same user reload keeps tag cache', async () => {
    const { useAuth, ClientTagService } = await setup();
    const first = renderHook(() => useAuth());
    await waitFor(() => {
      expect(first.result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();

    const second = renderHook(() => useAuth());
    await waitFor(() => {
      expect(second.result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();

    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
  });

  it('login as another user after sign out clears refilled tag cache', async () => {
    const { useAuth, ClientTagService } = await setup();
    const first = renderHook(() => useAuth());
    await waitFor(() => {
      expect(first.result.current.user).not.toBeNull();
    });
    await act(async () => {
      await first.result.current.handleSignOut();
    });
    await ClientTagService.getTags();

    mocks.getCurrentUser.mockResolvedValue(makeSession('user-2'));
    const second = renderHook(() => useAuth());
    await waitFor(() => {
      expect(second.result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();

    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });

  it('failed sign out keeps cache and reports error', async () => {
    mocks.signOut.mockRejectedValue(new Error('Ошибка сети'));
    const { useAuth, ClientTagService } = await setup();
    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });
    await ClientTagService.getTags();

    await act(async () => {
      await result.current.handleSignOut();
    });
    await ClientTagService.getTags();

    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('Ошибка сети');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
