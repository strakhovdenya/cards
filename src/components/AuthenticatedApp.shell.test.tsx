import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthenticatedApp } from './AuthenticatedApp';
import type { StudyScreen } from '@/utils/navigationUtils';

// Подменены только SDK входа, роутер, сеть и озвучка: useAuth, меню,
// оболочка и экраны настоящие
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  isAdmin: vi.fn(),
  router: { push: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  signOut: mocks.signOut,
  isAdmin: mocks.isAdmin,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}));
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
const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];
const USER_ID = 'user-regular';

const PROFILE = {
  id: USER_ID,
  email: 'regular@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  role: 'user',
  created_at: NOW,
  updated_at: NOW,
};

const CARD = {
  id: 'card-1',
  germanWord: 'Haus',
  translation: 'дом',
  user_id: USER_ID,
  learned: false,
  tags: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const VERB = {
  id: 'verb-1',
  infinitive: 'gehen',
  translation: 'идти',
  conjugations: PERSONS.map((person) => ({
    person,
    form: 'geh-form',
    translation: 'идти-форма',
  })),
  user_id: USER_ID,
  learned: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const TIME_QUESTION = {
  id: 'time-1',
  time_value: '10:00',
  hour: 10,
  minute: 0,
  formal_description: 'Десять часов',
  formal_words: ['zehn', 'Uhr'],
  informal_description: 'Десять',
  informal_words: ['zehn'],
  word_pool: ['zehn', 'Uhr'],
  difficulty_level: 1,
  is_active: true,
  created_at: NOW,
};

const RESPONSES: Record<string, unknown> = {
  '/api/cards': [CARD],
  '/api/nouns': [],
  '/api/tags': [],
  '/api/verbs': [VERB],
  '/api/verbs/random': VERB,
  '/api/time/random': TIME_QUESTION,
};

const installApi = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const { pathname } = new URL(String(input), 'http://localhost');
      const data = RESPONSES[pathname];
      return Promise.resolve(
        new Response(JSON.stringify(data === undefined ? {} : { data }), {
          status: data === undefined ? 404 : 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    })
  );
};

const installMatchMedia = () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
};

const MENU_PATHS: Record<StudyScreen, RegExp[]> = {
  cards: [/^Слова/, /^Карточки/],
  articles: [/^Слова/, /^Артикли/],
  'verbs-view': [/^Глаголы/, /^Просмотр/],
  'verbs-training': [/^Глаголы/, /^Тренировка/],
  'verbs-study': [/^Глаголы/, /^Изучение Изучение/],
  time: [/^Время/],
};

// Экран, его признак в дереве и подзаголовок шапки
const SCREEN_EXPECTATIONS: Array<{
  screen: StudyScreen;
  marker: RegExp;
  subtitle: string;
}> = [
  {
    screen: 'cards',
    marker: /Нажмите для показа/,
    subtitle: 'Существительные',
  },
  { screen: 'articles', marker: /^Всего: \d+$/, subtitle: 'Артикли' },
  { screen: 'verbs-view', marker: /^Просмотр глаголов$/, subtitle: 'Глаголы' },
  {
    screen: 'verbs-training',
    marker: /^Тренировка глаголов$/,
    subtitle: 'Глаголы',
  },
  { screen: 'verbs-study', marker: /Показать перевод/, subtitle: 'Глаголы' },
  { screen: 'time', marker: /^Проверить ответ$/, subtitle: 'Времена' },
];

// Проход по шести экранам через меню заметно дольше стандартных 5 с
const MULTI_SCREEN_TIMEOUT_MS = 30_000;

type User = ReturnType<typeof userEvent.setup>;

const openScreen = async (user: User, studyScreen: StudyScreen) => {
  await user.click(await screen.findByRole('button', { name: /^Изучение$/ }));
  for (const name of MENU_PATHS[studyScreen]) {
    await user.click(await screen.findByRole('button', { name }));
  }
};

const subtitle = () =>
  within(screen.getByRole('banner')).getByText(
    /^(Существительные|Артикли|Глаголы|Времена)$/
  ).textContent;

const renderApp = async () => {
  render(<AuthenticatedApp />);
  expect(await screen.findByText('German Word Cards')).toBeTruthy();
};

describe('AuthenticatedApp shared shell', () => {
  beforeEach(() => {
    installMatchMedia();
    installApi();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mocks.getCurrentUser.mockResolvedValue({
      user: { id: USER_ID },
      profile: PROFILE,
    });
    mocks.isAdmin.mockResolvedValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it(
    'authenticated shell keeps editing and non admin restrictions',
    async () => {
      const user = userEvent.setup();
      await renderApp();

      const editTab = screen.getByRole('button', { name: /^Редактирование$/ });
      expect((editTab as HTMLButtonElement).disabled).toBe(false);
      expect(screen.queryByText('Гость')).toBeNull();

      await user.click(
        screen.getByRole('button', { name: 'Открыть меню пользователя' })
      );
      expect(await screen.findByText('Выйти')).toBeTruthy();
      expect(screen.queryByText('Приглашения')).toBeNull();
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByText('Выйти')).toBeNull();
      });

      await user.click(editTab);
      expect(
        await screen.findByText('Выберите режим редактирования')
      ).toBeTruthy();

      await user.click(
        screen.getByRole('button', { name: /^Импорт карточек/ })
      );
      expect(await screen.findByText('Импорт')).toBeTruthy();
      await user.keyboard('{Escape}');

      await user.click(
        await screen.findByRole('button', { name: /^Управление тегами/ })
      );
      expect(
        await screen.findByRole('heading', { name: /Управление тегами/ })
      ).toBeTruthy();
    },
    MULTI_SCREEN_TIMEOUT_MS
  );

  it(
    'authenticated study navigation reaches all six screens',
    async () => {
      const user = userEvent.setup();
      await renderApp();

      for (const expectation of SCREEN_EXPECTATIONS) {
        await openScreen(user, expectation.screen);
        expect(
          (await screen.findAllByText(expectation.marker)).length,
          expectation.screen
        ).toBeGreaterThan(0);
        await waitFor(() => {
          expect(subtitle(), expectation.screen).toBe(expectation.subtitle);
        });
      }
    },
    MULTI_SCREEN_TIMEOUT_MS
  );
});
