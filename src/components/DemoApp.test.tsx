import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoApp } from './DemoApp';
import { ClientCardService } from '@/services/cardService';
import { ClientVerbService } from '@/services/verbService';
import type { Card, Verb } from '@/types';

vi.mock('@/services/cardService', () => ({
  ClientCardService: { getCards: vi.fn() },
}));
vi.mock('@/services/verbService', () => ({
  ClientVerbService: { getVerbs: vi.fn() },
}));
vi.mock('./CardViewer', () => ({
  CardViewer: ({ cards }: { cards: Card[] }) => (
    <div data-testid="card-viewer">{cards.length} cards</div>
  ),
}));
vi.mock('./VerbViewer', () => ({
  VerbViewer: ({ verbs }: { verbs: Verb[] }) => (
    <div data-testid="verb-viewer">{verbs.length} verbs</div>
  ),
}));
vi.mock('./ArticlesTrainer', () => ({ ArticlesTrainer: () => null }));
vi.mock('./TimeTraining', () => ({ TimeTraining: () => null }));

const getCards = vi.mocked(ClientCardService.getCards);
const getVerbs = vi.mocked(ClientVerbService.getVerbs);

const CARDS = [{ id: 'card-1' }, { id: 'card-2' }] as Card[];
const VERBS = [{ id: 'verb-1' }] as Verb[];
const RATE_LIMIT_MESSAGE = 'Слишком много запросов';

const openVerbs = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Глаголы/ }));
};

describe('DemoApp', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    getCards.mockReset();
    getVerbs.mockReset();
  });

  it('full success renders read-only demo', async () => {
    getCards.mockResolvedValue(CARDS);
    getVerbs.mockResolvedValue(VERBS);
    render(<DemoApp />);

    expect(await screen.findByText('2 cards')).toBeTruthy();
    await openVerbs();
    expect(await screen.findByText('1 verbs')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Повторить/ })).toBeNull();
    expect(getCards).toHaveBeenCalledWith({ guest: true });
    expect(getVerbs).toHaveBeenCalledWith({ guest: true });
  });

  it('cards stay visible when verbs fail', async () => {
    getCards.mockResolvedValue(CARDS);
    getVerbs.mockRejectedValue(new Error('Ошибка глаголов'));
    render(<DemoApp />);

    expect(await screen.findByText('2 cards')).toBeTruthy();
    await openVerbs();
    expect(await screen.findByText('Ошибка глаголов')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });

  it('verbs stay visible when cards fail', async () => {
    getCards.mockRejectedValue(new Error('Ошибка карточек'));
    getVerbs.mockResolvedValue(VERBS);
    render(<DemoApp />);

    expect(await screen.findByText('Ошибка карточек')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
    await openVerbs();
    expect(await screen.findByText('1 verbs')).toBeTruthy();
  });

  it('both sections show errors with retry', async () => {
    getCards.mockRejectedValue(new Error('Ошибка карточек'));
    getVerbs.mockRejectedValue(new Error('Ошибка глаголов'));
    render(<DemoApp />);

    expect(await screen.findByText('Ошибка карточек')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
    await openVerbs();
    expect(await screen.findByText('Ошибка глаголов')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });

  it('rate limit error does not auto retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      getCards.mockRejectedValue(new Error(RATE_LIMIT_MESSAGE));
      getVerbs.mockResolvedValue(VERBS);
      render(<DemoApp />);

      expect(await screen.findByText(RATE_LIMIT_MESSAGE)).toBeTruthy();
      await vi.advanceTimersByTimeAsync(120_000);

      expect(getCards).toHaveBeenCalledTimes(1);
      expect(getVerbs).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retry clears section error', async () => {
    getCards.mockRejectedValueOnce(new Error('Ошибка карточек'));
    getCards.mockResolvedValueOnce(CARDS);
    getVerbs.mockResolvedValue(VERBS);
    render(<DemoApp />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Повторить' })
    );

    expect(await screen.findByText('2 cards')).toBeTruthy();
    expect(screen.queryByText('Ошибка карточек')).toBeNull();
    expect(getCards).toHaveBeenCalledTimes(2);
    expect(getVerbs).toHaveBeenCalledTimes(1);
  });

  it('failed retry shows the error again', async () => {
    getCards.mockRejectedValueOnce(new Error('Первая ошибка'));
    getCards.mockRejectedValueOnce(new Error('Вторая ошибка'));
    getVerbs.mockResolvedValue(VERBS);
    render(<DemoApp />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Повторить' })
    );

    expect(await screen.findByText('Вторая ошибка')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });

  it('verbs retry reloads only verbs', async () => {
    getCards.mockResolvedValue(CARDS);
    getVerbs.mockRejectedValueOnce(new Error('Ошибка глаголов'));
    getVerbs.mockResolvedValueOnce(VERBS);
    render(<DemoApp />);

    await openVerbs();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Повторить' })
    );

    expect(await screen.findByText('1 verbs')).toBeTruthy();
    expect(getCards).toHaveBeenCalledTimes(1);
    expect(getVerbs).toHaveBeenCalledTimes(2);
  });

  it('shows a spinner while the section loads', async () => {
    getCards.mockReturnValue(new Promise(() => undefined));
    getVerbs.mockResolvedValue(VERBS);
    render(<DemoApp />);

    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('card-viewer')).toBeNull();
  });
});
