import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { DemoApp } from './DemoApp';
import { ClientCardService } from '@/services/cardService';
import { ClientVerbService } from '@/services/verbService';
import type { StudyScreen } from '@/utils/navigationUtils';
import type { Card, Verb } from '@/types';

// Заглушки экранов включаются только для блока частичных ошибок (#124):
// критерии общей оболочки работают с настоящими экранами
const stubs = vi.hoisted(() => ({ enabled: false }));

vi.mock('./CardViewer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./CardViewer')>();
  return {
    CardViewer: (props: ComponentProps<typeof actual.CardViewer>) =>
      stubs.enabled ? (
        <div data-testid="card-viewer">{props.cards.length} cards</div>
      ) : (
        <actual.CardViewer {...props} />
      ),
  };
});
vi.mock('./VerbViewer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./VerbViewer')>();
  return {
    VerbViewer: (props: ComponentProps<typeof actual.VerbViewer>) =>
      stubs.enabled ? (
        <div data-testid="verb-viewer">{props.verbs.length} verbs</div>
      ) : (
        <actual.VerbViewer {...props} />
      ),
  };
});
vi.mock('./ArticlesTrainer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ArticlesTrainer')>();
  return {
    ArticlesTrainer: (props: ComponentProps<typeof actual.ArticlesTrainer>) =>
      stubs.enabled ? null : <actual.ArticlesTrainer {...props} />,
  };
});
vi.mock('./TimeTraining', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./TimeTraining')>();
  return {
    TimeTraining: (props: ComponentProps<typeof actual.TimeTraining>) =>
      stubs.enabled ? null : <actual.TimeTraining {...props} />,
  };
});

// Озвучка не нужна; подсказка кнопки остаётся видимым маркером стороны карточки
vi.mock('./SpeechButton', () => ({
  SpeechButton: ({ tooltip }: { tooltip?: string }) => (
    <span data-testid="speech">{tooltip ?? ''}</span>
  ),
}));
vi.mock('@/services/speechService', () => ({
  useSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSupported: () => false,
    getAvailableVoices: () => Promise.resolve([]),
  }),
}));

// Маркеры: если гостевое дерево когда-нибудь смонтирует редакторы,
// импорт, менеджер тегов или приглашения — тесты это увидят
vi.mock('./CardEditor', () => ({
  CardEditor: () => <div data-testid="card-editor" />,
}));
vi.mock('./VerbEditor', () => ({
  VerbEditor: () => <div data-testid="verb-editor" />,
}));
vi.mock('./TagManager', () => ({
  TagManager: () => <div data-testid="tag-manager" />,
}));
vi.mock('./BulkImport', () => ({
  BulkImport: () => <div data-testid="bulk-import" />,
}));
vi.mock('./auth/InviteManager', () => ({
  InviteManager: () => <div data-testid="invite-manager" />,
}));
vi.mock('./navigation/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

const EDITING_MARKERS = [
  'card-editor',
  'verb-editor',
  'tag-manager',
  'bulk-import',
  'invite-manager',
  'user-menu',
];

const CARDS = [{ id: 'card-1' }, { id: 'card-2' }] as Card[];
const VERBS = [{ id: 'verb-1' }] as Verb[];
const RATE_LIMIT_MESSAGE = 'Слишком много запросов';

const NOW = '2026-10-29T00:00:00.000Z';
const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];

const GUEST_CARD = {
  id: 'card-1',
  germanWord: 'Haus',
  translation: 'дом',
  user_id: 'user-demo',
  learned: false,
  tags: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const GUEST_NOUN = {
  ...GUEST_CARD,
  id: 'noun-1',
  germanWord: 'das Haus',
  base_form: 'Haus',
  word_type: 'noun',
  grammar_data: { article: 'das' },
};

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

const TIME_QUESTION = {
  id: 'time-1',
  time_value: '10:00',
  hour: 10,
  minute: 0,
  formal_description: 'Десять часов',
  formal_words: ['zehn', 'Uhr'],
  informal_description: 'Десять',
  informal_words: ['zehn'],
  word_pool: ['zehn', 'Uhr', 'halb'],
  difficulty_level: 1,
  is_active: true,
  created_at: NOW,
};

interface GuestFixtures {
  cards?: unknown[];
  nouns?: unknown[];
  tags?: unknown[];
  verbs?: unknown[];
  randomVerb?: unknown;
  time?: unknown;
  failing?: string[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

interface FetchCall {
  url: URL;
  method: string;
}

// Подменяется только сеть: сервисы и экраны настоящие
const installGuestApi = ({
  cards = [GUEST_CARD],
  nouns = [GUEST_NOUN],
  tags = [],
  verbs = [GUEST_VERB],
  randomVerb = GUEST_VERB,
  time = TIME_QUESTION,
  failing = [],
}: GuestFixtures = {}) => {
  const calls: FetchCall[] = [];
  const responses: Record<string, () => Response> = {
    '/api/cards': () => json({ data: cards }),
    '/api/nouns': () => json({ data: nouns }),
    '/api/tags': () => json({ data: tags }),
    '/api/verbs': () => json({ data: verbs }),
    '/api/verbs/random': () =>
      randomVerb
        ? json({ data: randomVerb })
        : json({ error: 'No verbs available for training' }, 404),
    '/api/time/random': () => json({ data: time }),
  };
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    calls.push({ url, method: (init?.method ?? 'GET').toUpperCase() });
    if (failing.includes(url.pathname)) {
      return Promise.resolve(json({ error: 'Internal server error' }, 500));
    }
    const respond = responses[url.pathname];
    return Promise.resolve(
      respond ? respond() : json({ error: 'not found' }, 404)
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
};

const expectOnlyGuestReads = (calls: FetchCall[]) => {
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    expect(call.url.searchParams.get('guest'), call.url.pathname).toBe('1');
    expect(call.method, call.url.pathname).toBe('GET');
  }
};

const MENU_PATHS: Record<StudyScreen, RegExp[]> = {
  cards: [/^Слова/, /^Карточки/],
  articles: [/^Слова/, /^Артикли/],
  'verbs-view': [/^Глаголы/, /^Просмотр/],
  'verbs-training': [/^Глаголы/, /^Тренировка/],
  'verbs-study': [/^Глаголы/, /^Изучение Изучение/],
  time: [/^Время/],
};

// Проход по шести экранам через меню заметно дольше стандартных 5 с
const MULTI_SCREEN_TIMEOUT_MS = 30_000;

type User = ReturnType<typeof userEvent.setup>;

const openScreen = async (studyScreen: StudyScreen, user?: User) => {
  const actor = user ?? userEvent;
  await actor.click(await screen.findByRole('button', { name: /^Изучение$/ }));
  for (const name of MENU_PATHS[studyScreen]) {
    await actor.click(await screen.findByRole('button', { name }));
  }
};

const openVerbs = async () => {
  await openScreen('verbs-view');
};

const expectNoEditing = () => {
  for (const marker of EDITING_MARKERS) {
    expect(screen.queryByTestId(marker), marker).toBeNull();
  }
};

// Анимации диалогов выключены через prefers-reduced-motion
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

describe('DemoApp', () => {
  let getCards: MockInstance<typeof ClientCardService.getCards>;
  let getVerbs: MockInstance<typeof ClientVerbService.getVerbs>;

  beforeEach(() => {
    stubs.enabled = true;
    installMatchMedia();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getCards = vi.spyOn(ClientCardService, 'getCards');
    getVerbs = vi.spyOn(ClientVerbService, 'getVerbs');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    stubs.enabled = false;
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

describe('DemoApp shared shell', () => {
  beforeEach(() => {
    installMatchMedia();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('guest renders shared shell with guest badge', async () => {
    const calls = installGuestApi();
    render(<DemoApp />);

    expect(await screen.findByText('1 из 1')).toBeTruthy();
    expect(screen.getByText('German Word Cards')).toBeTruthy();
    expect(screen.getByText('Гость')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Изучение$/ })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /^Редактирование$/ })
    ).toBeTruthy();
    expect(screen.queryByText(/Demo режим/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Открыть меню пользователя' })
    ).toBeNull();
    expectNoEditing();
    expectOnlyGuestReads(calls);
  });

  it('guest cannot open editing', async () => {
    const calls = installGuestApi();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<DemoApp />);
    expect(await screen.findByText('1 из 1')).toBeTruthy();

    const editTab = screen.getByRole('button', { name: /^Редактирование$/ });
    expect((editTab as HTMLButtonElement).disabled).toBe(true);
    await user.click(editTab);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Выберите режим редактирования')).toBeNull();
    expect(screen.queryByText('Импорт')).toBeNull();
    expect(screen.getByText('1 из 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Перевернуть/ })).toBeTruthy();
    expectNoEditing();
    expectOnlyGuestReads(calls);
  });

  it(
    'all six guest study screens are usable',
    async () => {
      const calls = installGuestApi();
      const user = userEvent.setup();
      render(<DemoApp />);

      await openScreen('cards', user);
      expect(await screen.findByText(/Нажмите для показа/)).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /Перевернуть/ }));
      expect(await screen.findByText('Нажмите для возврата')).toBeTruthy();

      await openScreen('articles', user);
      await user.click(await screen.findByRole('button', { name: 'das' }));
      expect(await screen.findByText('Верно: 1')).toBeTruthy();

      await openScreen('verbs-view', user);
      expect(await screen.findByText('Произнести глагол')).toBeTruthy();
      await user.click(screen.getByRole('button', { name: /Перевернуть/ }));
      expect(screen.queryByText('Произнести глагол')).toBeNull();

      await openScreen('verbs-training', user);
      await user.click(
        await screen.findByRole('button', { name: /Показать ответ/ })
      );
      expect(await screen.findByText('Правильная форма:')).toBeTruthy();

      await openScreen('verbs-study', user);
      await user.click(
        await screen.findByRole('button', { name: /Показать перевод/ })
      );
      expect(
        await screen.findByText(
          'Нажмите "Правильно" или "Неправильно" для оценки'
        )
      ).toBeTruthy();
      expect(screen.getAllByText('идти').length).toBeGreaterThan(0);

      await openScreen('time', user);
      await user.click(await screen.findByText('zehn'));
      await user.click(screen.getByText('Uhr'));
      await user.click(screen.getByRole('button', { name: 'Проверить ответ' }));
      expect(await screen.findByText('Правильно!')).toBeTruthy();

      const paths = new Set(calls.map((call) => call.url.pathname));
      for (const path of [
        '/api/cards',
        '/api/nouns',
        '/api/verbs',
        '/api/verbs/random',
        '/api/time/random',
      ]) {
        expect(paths.has(path), path).toBe(true);
      }
      expectOnlyGuestReads(calls);
      expectNoEditing();
    },
    MULTI_SCREEN_TIMEOUT_MS
  );

  it(
    'empty guest decks keep editing inaccessible',
    async () => {
      const calls = installGuestApi({
        cards: [],
        nouns: [],
        verbs: [],
        randomVerb: null,
      });
      const user = userEvent.setup();
      render(<DemoApp />);

      const expectEmptyScreen = async (text: string) => {
        expect(await screen.findByText(text)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Добавить/ })).toBeNull();
        expectNoEditing();
      };

      await openScreen('cards', user);
      await expectEmptyScreen('Карточки не найдены');

      await openScreen('articles', user);
      await expectEmptyScreen('Всего: 0');
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'der' }).disabled
      ).toBe(true);

      await openScreen('verbs-view', user);
      await expectEmptyScreen('Нет глаголов');

      await openScreen('verbs-training', user);
      await expectEmptyScreen('Нет доступных глаголов для тренировки');

      await openScreen('verbs-study', user);
      await expectEmptyScreen('Нет доступных глаголов для изучения');

      await openScreen('time', user);
      expect(await screen.findByText('zehn')).toBeTruthy();
      expectOnlyGuestReads(calls);
    },
    MULTI_SCREEN_TIMEOUT_MS
  );

  it(
    'guest read errors never enable personal access or writes',
    async () => {
      const calls = installGuestApi({
        failing: ['/api/cards', '/api/nouns', '/api/tags', '/api/time/random'],
      });
      const user = userEvent.setup();
      render(<DemoApp />);

      expect(
        await screen.findByRole('button', { name: 'Повторить' })
      ).toBeTruthy();

      await openScreen('articles', user);
      expect(await screen.findByText('Всего: 0')).toBeTruthy();

      await openScreen('time', user);
      expect(
        await screen.findByText(/Ошибка при загрузке вопроса/)
      ).toBeTruthy();

      await openScreen('verbs-view', user);
      expect(await screen.findByText('Произнести глагол')).toBeTruthy();

      expect(screen.queryByText(/Войти|Вход/)).toBeNull();
      expectNoEditing();
      const paths = new Set(calls.map((call) => call.url.pathname));
      for (const path of [
        '/api/cards',
        '/api/nouns',
        '/api/tags',
        '/api/time/random',
      ]) {
        expect(paths.has(path), path).toBe(true);
      }
      expectOnlyGuestReads(calls);
    },
    MULTI_SCREEN_TIMEOUT_MS
  );
});
