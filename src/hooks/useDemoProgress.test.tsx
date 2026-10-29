import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoApp } from '@/components/DemoApp';
import { DEMO_PROGRESS_KEY } from './useDemoProgress';

vi.mock('@/components/SpeechButton', () => ({ SpeechButton: () => null }));
vi.mock('@/services/speechService', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSupported: () => false,
    getAvailableVoices: () => Promise.resolve([]),
  }),
}));

const NOW = '2026-10-29T00:00:00.000Z';

const CARD = {
  id: 'card-1',
  germanWord: 'Haus',
  translation: 'дом',
  user_id: 'user-demo',
  learned: false,
  tags: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const installApi = () => {
  const methods: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      methods.push((init?.method ?? 'GET').toUpperCase());
      const { pathname } = new URL(String(input), 'http://localhost');
      return Promise.resolve(
        json({ data: pathname === '/api/cards' ? [CARD] : [] })
      );
    })
  );
  return methods;
};

const learnedButton = () =>
  screen.getByRole('button', { name: /Выучено|Отметить как выученное/ });

const failingStorage = (method: 'getItem' | 'setItem') => () => {
  vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new Error(`storage ${method} denied`);
  });
};

const STORAGE_CASES: Array<{ name: string; arrange: () => void }> = [
  {
    name: 'corrupted JSON',
    arrange: () => {
      window.localStorage.setItem(DEMO_PROGRESS_KEY, '{"card-1": tru');
    },
  },
  {
    name: 'array instead of map',
    arrange: () => {
      window.localStorage.setItem(DEMO_PROGRESS_KEY, '[true]');
    },
  },
  {
    name: 'non boolean values',
    arrange: () => {
      window.localStorage.setItem(
        DEMO_PROGRESS_KEY,
        JSON.stringify({ 'card-1': 'yes' })
      );
    },
  },
  { name: 'getItem throws', arrange: failingStorage('getItem') },
  { name: 'setItem throws', arrange: failingStorage('setItem') },
];

// Несколько монтирований подряд заметно дольше стандартных 5 с
const SLOW_TEST_TIMEOUT_MS = 30_000;

describe('useDemoProgress', () => {
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
    'invalid or unavailable storage keeps progress in memory',
    async () => {
      for (const storageCase of STORAGE_CASES) {
        window.localStorage.clear();
        const methods = installApi();
        storageCase.arrange();
        const user = userEvent.setup();
        render(<DemoApp />);

        expect(
          await screen.findByText('1 из 1'),
          storageCase.name
        ).toBeTruthy();
        expect(learnedButton().textContent).toBe('Отметить как выученное');

        await user.click(learnedButton());
        expect(learnedButton().textContent, storageCase.name).toBe('Выучено');

        await user.click(learnedButton());
        expect(learnedButton().textContent, storageCase.name).toBe(
          'Отметить как выученное'
        );
        expect(
          methods.every((method) => method === 'GET'),
          storageCase.name
        ).toBe(true);

        cleanup();
        vi.restoreAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.unstubAllGlobals();
      }
    },
    SLOW_TEST_TIMEOUT_MS
  );
});
