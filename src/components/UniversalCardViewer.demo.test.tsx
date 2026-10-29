import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoApp } from './DemoApp';
import { CardViewer } from './CardViewer';
import { ClientCardService } from '@/services/cardService';
import { DEMO_PROGRESS_KEY } from '@/hooks/useDemoProgress';
import type { Card } from '@/types';

vi.mock('./SpeechButton', () => ({ SpeechButton: () => null }));
vi.mock('@/services/speechService', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSupported: () => false,
    getAvailableVoices: () => Promise.resolve([]),
  }),
}));

const NOW = '2026-10-29T00:00:00.000Z';
const WORDS = ['Haus', 'Baum', 'Katze'];

const makeCard = (germanWord: string, index: number) => ({
  id: `card-${index + 1}`,
  germanWord,
  translation: `${germanWord}-ru`,
  user_id: 'user-demo',
  learned: false,
  tags: [],
  createdAt: NOW,
  updatedAt: NOW,
});

const CARDS = WORDS.map(makeCard);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const installApi = () => {
  const methods: string[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    methods.push((init?.method ?? 'GET').toUpperCase());
    const { pathname } = new URL(String(input), 'http://localhost');
    if (pathname === '/api/cards')
      return Promise.resolve(json({ data: CARDS }));
    return Promise.resolve(json({ data: [] }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return methods;
};

const progress = () => screen.getByText(/^\d+ из \d+$/).textContent;

const currentWord = () =>
  screen.getByRole('heading', { level: 4 }).textContent ?? '';

const learnedButton = () =>
  screen.getByRole('button', { name: /Выучено|Отметить как выученное/ });

type User = ReturnType<typeof userEvent.setup>;

const readOrder = async (user: User) => {
  const order: string[] = [];
  for (let step = 0; step < WORDS.length; step++) {
    order.push(currentWord());
    await user.click(screen.getByRole('button', { name: /Вперёд/ }));
  }
  return order;
};

// Несколько монтирований подряд заметно дольше стандартных 5 с
const SLOW_TEST_TIMEOUT_MS = 30_000;

describe('UniversalCardViewer demo progress', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it(
    'guest learned state persists on device without writes or deck reset',
    async () => {
      const methods = installApi();
      const updateCard = vi.spyOn(ClientCardService, 'updateCardWithResult');
      const user = userEvent.setup();
      const view = render(<DemoApp />);

      expect(await screen.findByText('1 из 3')).toBeTruthy();
      const order = await readOrder(user);
      await user.click(screen.getByRole('button', { name: /Вперёд/ }));
      expect(progress()).toBe('2 из 3');
      const secondWord = currentWord();

      await user.click(learnedButton());

      expect(learnedButton().textContent).toBe('Выучено');
      expect(progress()).toBe('2 из 3');
      expect(currentWord()).toBe(secondWord);
      await user.click(screen.getByRole('button', { name: /Назад/ }));
      expect(await readOrder(user)).toEqual(order);
      expect(methods.every((method) => method === 'GET')).toBe(true);
      expect(updateCard).not.toHaveBeenCalled();

      view.unmount();
      render(<DemoApp />);
      expect(await screen.findByText('1 из 3')).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /Вперёд/ }));
      expect(currentWord()).toBe(secondWord);
      expect(learnedButton().textContent).toBe('Выучено');
      expect(methods.every((method) => method === 'GET')).toBe(true);
      expect(updateCard).not.toHaveBeenCalled();
    },
    SLOW_TEST_TIMEOUT_MS
  );

  it('authenticated learned ignores guest progress', async () => {
    installApi();
    window.localStorage.setItem(
      DEMO_PROGRESS_KEY,
      JSON.stringify({ 'card-1': true, 'card-2': true, 'card-3': true })
    );
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const updateCard = vi
      .spyOn(ClientCardService, 'updateCardWithResult')
      .mockResolvedValue({ status: 'success', data: null as never });
    const user = userEvent.setup();

    const Parent = () => {
      const [cards, setCards] = useState(CARDS as unknown as Card[]);
      return (
        <CardViewer
          cards={cards}
          onCardUpdate={(updated) => {
            setCards((prev) =>
              prev.map((card) => (card.id === updated.id ? updated : card))
            );
          }}
        />
      );
    };
    render(<Parent />);

    expect(await screen.findByText('1 из 3')).toBeTruthy();
    expect(learnedButton().textContent).toBe('Отметить как выученное');
    await user.click(learnedButton());

    expect(updateCard).toHaveBeenCalledWith('card-1', { learned: true });
    expect(learnedButton().textContent).toBe('Выучено');
    const touchedKeys = [...getItem.mock.calls, ...setItem.mock.calls].map(
      (call) => call[0]
    );
    expect(touchedKeys).not.toContain(DEMO_PROGRESS_KEY);
  });
});
