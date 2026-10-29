import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UniversalCardViewer } from './UniversalCardViewer';
import { BasicCardStrategy } from '@/strategies/BasicCardStrategy';
import type { MutationResult } from '@/services/mutationResult';
import type { Card, Tag } from '@/types';

const TAG_A: Tag = {
  id: 'tag-a',
  name: 'Тег A',
  color: '#1976d2',
  user_id: 'user-1',
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

vi.mock('@/services/tagService', () => ({
  ClientTagService: { getTags: vi.fn(() => Promise.resolve([TAG_A])) },
}));
vi.mock('./SpeechButton', () => ({ SpeechButton: () => null }));

const WORDS = ['Haus', 'Baum', 'Katze', 'Hund', 'Tisch'];
const RANDOM_SEQUENCE = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4];

const makeCard = (id: string, germanWord: string, tags: Tag[] = []) => ({
  id,
  germanWord,
  translation: `${germanWord}-ru`,
  user_id: 'user-1',
  tags,
  learned: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

// Первая и третья карточки с тегом A — набор для проверки фильтра
const makeCards = (): Card[] =>
  WORDS.map((word, index) =>
    makeCard(String(index + 1), word, index % 2 === 0 ? [TAG_A] : [])
  );

const strategy = new BasicCardStrategy();

type ToggleResult = MutationResult<unknown>;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const defer = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

interface SetupOptions {
  isGuest?: boolean;
  result?: ToggleResult;
  refetchLearned?: () => Promise<{ learned: boolean }>;
}

// Родитель держит карточки в состоянии, как App: каждое обновление
// приходит в просмотрщик новым массивом
const setup = ({
  isGuest = false,
  result = { status: 'success', data: null },
  refetchLearned = () => Promise.resolve({ learned: true }),
}: SetupOptions = {}) => {
  const toggleLearnedService = vi.fn(() => Promise.resolve(result));
  const refetchCard = vi.fn(refetchLearned);
  const parent: { setCards: (update: (prev: Card[]) => Card[]) => void } = {
    setCards: () => undefined,
  };

  const Parent = () => {
    const [cards, setCards] = useState(makeCards);
    parent.setCards = setCards;
    return (
      <UniversalCardViewer
        cards={cards}
        strategy={strategy}
        onCardUpdate={(updated: Card) => {
          setCards((prev) =>
            prev.map((card) => (card.id === updated.id ? updated : card))
          );
        }}
        toggleLearnedService={toggleLearnedService}
        refetchCard={refetchCard}
        isGuest={isGuest}
      />
    );
  };

  const user = userEvent.setup();
  render(<Parent />);
  return { user, toggleLearnedService, refetchCard, parent };
};

const currentWord = () =>
  screen.getByRole('heading', { level: 4 }).textContent ?? '';

const progress = () => screen.getByText(/^\d+ из \d+$/).textContent;

const learnedButton = () =>
  screen.getByRole('button', { name: /Выучено|Отметить как выученное/ });

type User = ReturnType<typeof userEvent.setup>;

// Полный круг по сессии возвращает на исходную позицию
const readOrder = async (user: User) => {
  const total = Number(progress()?.split(' из ')[1]);
  const order: string[] = [];
  for (let step = 0; step < total; step++) {
    order.push(currentWord());
    await user.click(screen.getByRole('button', { name: /Вперёд/ }));
  }
  return order;
};

const goTo = async (user: User, position: number) => {
  while (!progress()?.startsWith(`${position} из`)) {
    await user.click(screen.getByRole('button', { name: /Вперёд/ }));
  }
};

const shuffle = async (user: User) => {
  await user.click(screen.getByRole('button', { name: /Перемешать/ }));
};

describe('UniversalCardViewer learning session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let call = 0;
    vi.spyOn(Math, 'random').mockImplementation(
      () => RANDOM_SEQUENCE[call++ % RANDOM_SEQUENCE.length]
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('learned toggle keeps position and order', async () => {
    const { user, toggleLearnedService } = setup();
    await screen.findByText('1 из 5');
    await shuffle(user);
    const order = await readOrder(user);
    await goTo(user, 3);
    const word = currentWord();

    await user.click(learnedButton());

    expect(toggleLearnedService).toHaveBeenCalledTimes(1);
    expect(progress()).toBe('3 из 5');
    expect(currentWord()).toBe(word);
    expect(learnedButton().textContent).toContain('Выучено');
    await goTo(user, 1);
    expect(await readOrder(user)).toEqual(order);
  });

  it('rejected toggle rolls back value without moving position', async () => {
    const { user } = setup({
      result: {
        status: 'rejected',
        message: 'Карточка не найдена',
        httpStatus: 404,
      },
    });
    await screen.findByText('1 из 5');
    await shuffle(user);
    const order = await readOrder(user);
    await goTo(user, 4);
    const word = currentWord();

    await user.click(learnedButton());

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Карточка не найдена')
    );
    expect(learnedButton().textContent).toContain('Отметить как выученное');
    expect(progress()).toBe('4 из 5');
    expect(currentWord()).toBe(word);
    await goTo(user, 1);
    expect(await readOrder(user)).toEqual(order);
  });

  it('unknown toggle reconciles single card without reset', async () => {
    const refetch = defer<{ learned: boolean }>();
    const { user, refetchCard } = setup({
      result: { status: 'unknown', message: 'Сеть', httpStatus: null },
      refetchLearned: () => refetch.promise,
    });
    await screen.findByText('1 из 5');
    await shuffle(user);
    const order = await readOrder(user);
    await goTo(user, 2);
    const word = currentWord();
    const cardId = String(WORDS.indexOf(word) + 1);

    await user.click(learnedButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('не подтверждено');
    expect(learnedButton().textContent).toContain('Выучено');
    expect(refetchCard).toHaveBeenCalledTimes(1);
    expect(refetchCard).toHaveBeenCalledWith(cardId);

    await act(async () => {
      refetch.resolve({ learned: true });
      await refetch.promise;
    });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(learnedButton().textContent).toContain('Выучено');
    expect(progress()).toBe('2 из 5');
    expect(currentWord()).toBe(word);
    await goTo(user, 1);
    expect(await readOrder(user)).toEqual(order);
  });

  it('filter change resets position', async () => {
    const { user } = setup();
    await screen.findByText('1 из 5');
    await goTo(user, 4);

    await user.click(screen.getByText('Фильтрация по тегам'));
    await user.click(await screen.findByRole('button', { name: TAG_A.name }));

    expect(progress()).toBe('1 из 3');
    expect(currentWord()).toBe('Haus');
  });

  it('explicit shuffle resets order and position', async () => {
    const { user } = setup();
    await screen.findByText('1 из 5');
    const original = await readOrder(user);
    await goTo(user, 3);

    await shuffle(user);

    expect(progress()).toBe('1 из 5');
    const shuffled = await readOrder(user);
    expect(shuffled).not.toEqual(original);
    expect([...shuffled].sort()).toEqual([...original].sort());
  });

  it('adding a card resets the session set', async () => {
    const { user, parent } = setup();
    await screen.findByText('1 из 5');
    await goTo(user, 3);

    act(() => {
      parent.setCards((prev) => [makeCard('6', 'Stuhl'), ...prev]);
    });

    expect(progress()).toBe('1 из 6');
    expect(currentWord()).toBe('Stuhl');
  });

  it('guest toggle sends no request', async () => {
    const { user, toggleLearnedService, refetchCard } = setup({
      isGuest: true,
    });
    await screen.findByText('1 из 5');
    await goTo(user, 2);

    expect(learnedButton()).toHaveProperty('disabled', true);
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard('{Enter}');

    expect(toggleLearnedService).not.toHaveBeenCalled();
    expect(refetchCard).not.toHaveBeenCalled();
    expect(progress()).toBe('2 из 5');
    expect(learnedButton().textContent).toContain('Отметить как выученное');
  });

  it('repeat sends explicit target value', async () => {
    const { user, toggleLearnedService, refetchCard } = setup({
      result: { status: 'unknown', message: 'Сеть', httpStatus: null },
      refetchLearned: () => Promise.resolve({ learned: false }),
    });
    await screen.findByText('1 из 5');

    await user.click(learnedButton());

    expect(refetchCard).toHaveBeenCalledWith('1');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'не сохранена'
    );
    expect(learnedButton().textContent).toContain('Отметить как выученное');

    toggleLearnedService.mockImplementation(() =>
      Promise.resolve<ToggleResult>({ status: 'success', data: null })
    );
    await user.click(learnedButton());

    expect(toggleLearnedService).toHaveBeenNthCalledWith(1, '1', true);
    expect(toggleLearnedService).toHaveBeenNthCalledWith(2, '1', true);
    expect(learnedButton().textContent).toContain('Выучено');
    expect(progress()).toBe('1 из 5');
  });
});
