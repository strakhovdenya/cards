import { describe, it, expect, vi, beforeEach } from 'vitest';
import { timeService } from '@/services/timeService';
import type { TimeQuestion } from '@/services/timeService';

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: vi.fn(),
}));

import { getServiceSupabase } from '@/lib/supabase';

const mockGetServiceSupabase = vi.mocked(getServiceSupabase);

type BuilderResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

function createBuilder(result: BuilderResult) {
  const b: {
    select: (...args: unknown[]) => typeof b;
    eq: (...args: unknown[]) => typeof b;
    order: (...args: unknown[]) => typeof b;
    range: (...args: unknown[]) => typeof b;
    insert: (...args: unknown[]) => typeof b;
    update: (...args: unknown[]) => typeof b;
    delete: (...args: unknown[]) => typeof b;
    single: () => Promise<BuilderResult>;
    then: <T>(
      resolve: (val: BuilderResult) => T,
      reject?: (err: unknown) => T
    ) => Promise<T>;
  } = {
    select: () => b,
    eq: () => b,
    order: () => b,
    range: () => b,
    insert: () => b,
    update: () => b,
    delete: () => b,
    single: () => Promise.resolve(result),
    then: <T>(
      resolve: (val: BuilderResult) => T,
      reject?: (err: unknown) => T
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return b;
}

function makeSupabase(builders: Array<ReturnType<typeof createBuilder>>) {
  let callIndex = 0;
  return {
    from: vi.fn(() => {
      const builder = builders[callIndex] ?? builders[builders.length - 1];
      callIndex++;
      return builder;
    }),
  } as unknown as ReturnType<typeof getServiceSupabase>;
}

const mockQuestion: TimeQuestion = {
  id: 'q1',
  time_value: '08:00',
  hour: 8,
  minute: 0,
  formal_description: 'acht Uhr',
  formal_words: ['acht', 'Uhr'],
  informal_description: 'acht',
  informal_words: ['acht'],
  word_pool: ['acht', 'Uhr'],
  difficulty_level: 1,
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('timeService.getTimeQuestionById', () => {
  it('returns question when found', async () => {
    const builder = createBuilder({ data: mockQuestion, error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.getTimeQuestionById('q1');
    expect(result).toEqual(mockQuestion);
  });

  it('returns null when error occurs', async () => {
    const builder = createBuilder({
      data: null,
      error: { message: 'Not found' },
    });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.getTimeQuestionById('q1');
    expect(result).toBeNull();
  });

  it('returns null when single() resolves with error', async () => {
    const builder = createBuilder({ data: null, error: { code: 'PGRST116' } });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.getTimeQuestionById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('timeService.getAllTimeQuestions', () => {
  it('returns questions on success', async () => {
    const builder = createBuilder({ data: [mockQuestion], error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.getAllTimeQuestions();
    expect(result).toEqual([mockQuestion]);
  });

  it('returns empty array on error (does not throw)', async () => {
    const builder = createBuilder({
      data: null,
      error: { message: 'DB error' },
    });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.getAllTimeQuestions();
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    const builder = createBuilder({ data: null, error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.getAllTimeQuestions();
    expect(result).toEqual([]);
  });
});

describe('timeService.createTimeQuestion', () => {
  it('returns created question on success', async () => {
    const builder = createBuilder({ data: mockQuestion, error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const request = {
      time_value: '08:00',
      hour: 8,
      minute: 0,
      formal_description: 'acht Uhr',
      formal_words: ['acht', 'Uhr'],
      informal_description: 'acht',
      informal_words: ['acht'],
      word_pool: ['acht', 'Uhr'],
      difficulty_level: 1,
    };
    const result = await timeService.createTimeQuestion(request);
    expect(result).toEqual(mockQuestion);
  });

  it('returns null on error', async () => {
    const builder = createBuilder({
      data: null,
      error: { message: 'Insert failed' },
    });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const result = await timeService.createTimeQuestion({
      time_value: '08:00',
      hour: 8,
      minute: 0,
      formal_description: 'acht Uhr',
      formal_words: [],
      informal_description: 'acht',
      informal_words: [],
      word_pool: [],
      difficulty_level: 1,
    });
    expect(result).toBeNull();
  });
});

describe('timeService.getTimeQuestionsStats', () => {
  it('aggregates byDifficulty for active questions only', async () => {
    const data = [
      { difficulty_level: 1, is_active: true },
      { difficulty_level: 1, is_active: true },
      { difficulty_level: 2, is_active: true },
      { difficulty_level: 1, is_active: false },
    ];
    const builder = createBuilder({ data, error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const stats = await timeService.getTimeQuestionsStats();
    expect(stats.total).toBe(4);
    expect(stats.active).toBe(3);
    expect(stats.byDifficulty).toEqual({ 1: 2, 2: 1 });
  });

  it('returns zeros on error', async () => {
    const builder = createBuilder({ data: null, error: { message: 'Error' } });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const stats = await timeService.getTimeQuestionsStats();
    expect(stats).toEqual({ total: 0, active: 0, byDifficulty: {} });
  });

  it('returns empty byDifficulty when no active questions', async () => {
    const data = [
      { difficulty_level: 1, is_active: false },
      { difficulty_level: 2, is_active: false },
    ];
    const builder = createBuilder({ data, error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([builder]));

    const stats = await timeService.getTimeQuestionsStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(0);
    expect(stats.byDifficulty).toEqual({});
  });
});

describe('timeService.getRandomTimeQuestion', () => {
  it('returns a question when count > 0 and data query succeeds', async () => {
    const countBuilder = createBuilder({ count: 5, error: null });
    const dataBuilder = createBuilder({ data: mockQuestion, error: null });
    mockGetServiceSupabase.mockReturnValue(
      makeSupabase([countBuilder, dataBuilder])
    );

    const result = await timeService.getRandomTimeQuestion();
    expect(result).toEqual(mockQuestion);
  });

  it('returns null when count is 0', async () => {
    const countBuilder = createBuilder({ count: 0, error: null });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([countBuilder]));

    const result = await timeService.getRandomTimeQuestion();
    expect(result).toBeNull();
  });

  it('returns null when count query has error', async () => {
    const countBuilder = createBuilder({
      count: null,
      error: { message: 'Count error' },
    });
    mockGetServiceSupabase.mockReturnValue(makeSupabase([countBuilder]));

    const result = await timeService.getRandomTimeQuestion();
    expect(result).toBeNull();
  });

  it('returns null when data query has error', async () => {
    const countBuilder = createBuilder({ count: 3, error: null });
    const dataBuilder = createBuilder({
      data: null,
      error: { message: 'Fetch error' },
    });
    mockGetServiceSupabase.mockReturnValue(
      makeSupabase([countBuilder, dataBuilder])
    );

    const result = await timeService.getRandomTimeQuestion();
    expect(result).toBeNull();
  });
});
