import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VerbTraining } from './VerbTraining';
import { VerbStudy } from './VerbStudy';

vi.mock('@/services/speechService', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSupported: () => false,
    getAvailableVoices: () => Promise.resolve([]),
  }),
}));

const NOW = '2026-10-29T00:00:00.000Z';
const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];

const GUEST_VERB = {
  id: 'verb-1',
  infinitive: 'gehen',
  translation: 'идти',
  conjugations: PERSONS.map((person) => ({
    person,
    form: 'geh-form',
    translation: 'идти-форма',
  })),
  user_id: 'user-demo',
  learned: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

interface FetchCall {
  url: URL;
  method: string;
}

// Ответ по пути запроса; все вызовы записываются для проверки guest=1
const installApi = (respond: (path: string) => Response) => {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    calls.push({ url, method: (init?.method ?? 'GET').toUpperCase() });
    return Promise.resolve(respond(url.pathname));
  });
  vi.stubGlobal('fetch', fetchMock);
  return () => calls;
};

const SCREENS = [
  {
    name: 'VerbTraining',
    render: () => render(<VerbTraining isGuest />),
    path: '/api/verbs/random',
    ok: () => json({ data: GUEST_VERB }),
    empty: () => json({ error: 'No verbs available for training' }, 404),
    errorText: 'Ошибка при загрузке глагола',
    emptyText: 'Нет доступных глаголов для тренировки',
  },
  {
    name: 'VerbStudy',
    render: () => render(<VerbStudy isGuest />),
    path: '/api/verbs',
    ok: () => json({ data: [GUEST_VERB] }),
    empty: () => json({ data: [] }),
    errorText: 'Ошибка при загрузке глаголов',
    emptyText: 'Нет доступных глаголов для изучения',
  },
];

describe('guest verb modes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('guest verb modes request guest data', async () => {
    for (const item of SCREENS) {
      const readCalls = installApi(() => item.ok());
      item.render();

      expect(await screen.findByText('gehen'), item.name).toBeTruthy();
      const calls = readCalls();
      expect(calls, item.name).toHaveLength(1);
      expect(calls[0].url.pathname).toBe(item.path);
      expect(calls[0].url.searchParams.get('guest')).toBe('1');
      expect(calls[0].method).toBe('GET');
      cleanup();
    }
  });

  it('guest verb failures never fall back to personal requests', async () => {
    const outcomes = [
      { label: '500', respond: () => json({ error: 'Internal' }, 500) },
      { label: '429', respond: () => json({ error: 'Слишком много' }, 429) },
      { label: 'empty', respond: null },
    ];

    for (const item of SCREENS) {
      for (const outcome of outcomes) {
        const label = `${item.name}/${outcome.label}`;
        const readCalls = installApi(outcome.respond ?? item.empty);
        item.render();

        const expected = outcome.respond ? item.errorText : item.emptyText;
        expect(await screen.findByText(expected), label).toBeTruthy();
        const calls = readCalls();
        expect(calls, label).toHaveLength(1);
        for (const call of calls) {
          expect(call.url.pathname, label).toBe(item.path);
          expect(call.url.searchParams.get('guest'), label).toBe('1');
          expect(call.method, label).toBe('GET');
        }
        cleanup();
        vi.unstubAllGlobals();
      }
    }
  });
});
