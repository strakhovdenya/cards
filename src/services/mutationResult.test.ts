import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reconcile, requestMutation } from '@/services/mutationResult';

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const POST_INIT: RequestInit = { method: 'POST', body: '{}' };

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reconcile', () => {
  const hasSecond = (items: { id: string }[]) =>
    items.some((item) => item.id === '2');

  it('reconcile reports found without resending', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const mutate = vi.fn(() => requestMutation('/api/x', POST_INIT));
    const outcome = await mutate();
    expect(outcome.status).toBe('unknown');

    const refetch = vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await reconcile(refetch, hasSecond);

    expect(result).toEqual({ found: true });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('reconcile reports missing without resending', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const mutate = vi.fn(() => requestMutation('/api/x', POST_INIT));
    const outcome = await mutate();
    expect(outcome.status).toBe('unknown');

    const refetch = vi.fn().mockResolvedValue([{ id: '1' }]);
    const result = await reconcile(refetch, hasSecond);

    expect(result).toEqual({ found: false });
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('propagates a refetch failure', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(reconcile(refetch, () => true)).rejects.toThrow('offline');
  });
});

describe('requestMutation', () => {
  it('keeps unknown distinct from rejected', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Нет прав' }, 403));
    const rejected = await requestMutation('/api/x', POST_INIT);

    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const unknown = await requestMutation('/api/x', POST_INIT);

    expect(rejected).toEqual({
      status: 'rejected',
      message: 'Нет прав',
      httpStatus: 403,
    });
    expect(unknown).toMatchObject({ status: 'unknown', httpStatus: null });
  });

  it('returns partial when the detector finds details', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: 1, flag: true }, 200));
    const result = await requestMutation<number>('/api/x', POST_INIT, (body) =>
      body.flag === true ? { kind: 'tagsNotAttached' } : null
    );
    expect(result).toEqual({
      status: 'partial',
      data: 1,
      details: { kind: 'tagsNotAttached' },
    });
  });

  it('reports unknown when handling an accepted response fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockFetch.mockResolvedValue(jsonResponse({ data: 1 }, 201));
    const brokenDetector = () => {
      throw new TypeError('bug');
    };

    const result = await requestMutation('/api/x', POST_INIT, brokenDetector);

    expect(result).toMatchObject({ status: 'unknown', httpStatus: 201 });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
