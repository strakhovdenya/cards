import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeTraining } from './TimeTraining';
import type { TimeQuestion } from '@/services/timeService';

vi.mock('./SpeechButton', () => ({
  SpeechButton: () => null,
}));

const makeQuestion = (timeValue: string, words: string[]): TimeQuestion => ({
  id: timeValue,
  time_value: timeValue,
  hour: 0,
  minute: 0,
  formal_description: '',
  formal_words: words,
  informal_description: '',
  informal_words: words,
  word_pool: words,
  difficulty_level: 1,
  is_active: true,
  created_at: '',
  updated_at: '',
});

const questionA = makeQuestion('10:00', ['zehn', 'Uhr']);
const questionB = makeQuestion('11:00', ['elf', 'Uhr']);
const questionC = makeQuestion('12:00', ['zwölf', 'Uhr']);

const okResponse = (question: TimeQuestion) =>
  ({ ok: true, json: () => Promise.resolve({ data: question }) }) as Response;

const failResponse = () =>
  ({
    ok: false,
    json: () => Promise.resolve({ error: 'Сервер недоступен' }),
  }) as Response;

const createDeferred = () => {
  let resolve: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const readStat = (label: string) =>
  screen.getByText(label).previousElementSibling?.textContent;

const readStats = () => ({
  total: readStat('Всего'),
  correct: readStat('Правильно'),
  incorrect: readStat('Неправильно'),
});

// Слово есть и в пуле, и среди выбранных; кликаем по пулу — он идёт последним
const pickWord = async (
  user: ReturnType<typeof userEvent.setup>,
  word: string
) => {
  await user.click(screen.getAllByText(word).at(-1) as HTMLElement);
};

const checkAnswer = async (
  user: ReturnType<typeof userEvent.setup>,
  words: string[]
) => {
  const clearButton = screen.getByRole('button', { name: 'Очистить всё' });
  if (!(clearButton as HTMLButtonElement).disabled)
    await user.click(clearButton);
  for (const word of words) await pickWord(user, word);
  await user.click(
    screen.getByRole('button', { name: /Проверить (ответ|снова)/ })
  );
};

describe('TimeTraining statistics and request ordering', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('counts first check only', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(questionA));
    const user = userEvent.setup();
    render(<TimeTraining isGuest />);
    await screen.findByText(/Вопрос: 10:00/);

    await checkAnswer(user, ['Uhr']);
    expect(readStats()).toEqual({
      total: '1',
      correct: '0',
      incorrect: '1',
    });

    await checkAnswer(user, ['zehn', 'Uhr']);
    expect(screen.getByText('Правильно!')).toBeTruthy();
    expect(readStats()).toEqual({
      total: '1',
      correct: '0',
      incorrect: '1',
    });
  });

  it('shows answer for last requested question', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(questionA));
    const first = createDeferred();
    const second = createDeferred();
    fetchMock.mockReturnValueOnce(first.promise);
    fetchMock.mockReturnValueOnce(second.promise);
    const user = userEvent.setup();
    render(<TimeTraining isGuest />);
    await screen.findByText(/Вопрос: 10:00/);

    await checkAnswer(user, ['zehn', 'Uhr']);
    await user.click(screen.getByRole('button', { name: 'Следующий вопрос' }));
    await user.click(screen.getByRole('button', { name: 'Начать заново' }));

    second.resolve(okResponse(questionC));
    await screen.findByText(/Вопрос: 12:00/);
    await act(async () => {
      first.resolve(okResponse(questionB));
      await new Promise((done) => setTimeout(done, 20));
    });

    expect(screen.getByText(/Вопрос: 12:00/)).toBeTruthy();
    expect(screen.queryByText(/Вопрос: 11:00/)).toBeNull();
  });

  it('new question counts as new attempt', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(questionA));
    fetchMock.mockResolvedValueOnce(okResponse(questionB));
    const user = userEvent.setup();
    render(<TimeTraining isGuest />);
    await screen.findByText(/Вопрос: 10:00/);

    await checkAnswer(user, ['zehn', 'Uhr']);
    await user.click(screen.getByRole('button', { name: 'Следующий вопрос' }));
    await screen.findByText(/Вопрос: 11:00/);
    await checkAnswer(user, ['Uhr']);

    expect(readStats()).toEqual({
      total: '2',
      correct: '1',
      incorrect: '1',
    });
  });

  it('request error leaves stats unchanged', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(okResponse(questionA));
    fetchMock.mockResolvedValueOnce(failResponse());
    const user = userEvent.setup();
    render(<TimeTraining isGuest />);
    await screen.findByText(/Вопрос: 10:00/);

    await checkAnswer(user, ['zehn', 'Uhr']);
    await user.click(screen.getByRole('button', { name: 'Следующий вопрос' }));

    expect(await screen.findByText(/Сервер недоступен/)).toBeTruthy();
    expect(readStats()).toEqual({
      total: '1',
      correct: '1',
      incorrect: '0',
    });
  });

  it('reset stats clears counters', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(questionA));
    fetchMock.mockResolvedValueOnce(okResponse(questionB));
    const user = userEvent.setup();
    render(<TimeTraining isGuest />);
    await screen.findByText(/Вопрос: 10:00/);

    await checkAnswer(user, ['Uhr']);
    await user.click(screen.getByRole('button', { name: 'Начать заново' }));
    await screen.findByText(/Вопрос: 11:00/);
    expect(readStats()).toEqual({
      total: '0',
      correct: '0',
      incorrect: '0',
    });

    await checkAnswer(user, ['elf', 'Uhr']);
    expect(readStats()).toEqual({
      total: '1',
      correct: '1',
      incorrect: '0',
    });
  });
});
