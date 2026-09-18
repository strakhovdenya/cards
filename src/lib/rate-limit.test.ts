import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RateLimitResult } from './rate-limit';

// --- In-memory limiter: pure sync logic, no Redis involved ---

let checkRateLimitInMemory: (
  key: string,
  maxRequests: number,
  windowMs: number
) => RateLimitResult;

describe('checkRateLimitInMemory', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import('./rate-limit');
    checkRateLimitInMemory = mod.checkRateLimitInMemory;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request and decrements remaining', () => {
    const result = checkRateLimitInMemory('ip1', 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks a request that exceeds the limit', () => {
    checkRateLimitInMemory('ip1', 2, 60_000);
    checkRateLimitInMemory('ip1', 2, 60_000);
    const third = checkRateLimitInMemory('ip1', 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('returns remaining = 0 on the last allowed request', () => {
    checkRateLimitInMemory('ip1', 2, 60_000);
    const last = checkRateLimitInMemory('ip1', 2, 60_000);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
  });

  it('allows again after the window expires', () => {
    checkRateLimitInMemory('ip1', 1, 1_000);
    vi.advanceTimersByTime(1_001);
    const result = checkRateLimitInMemory('ip1', 1, 1_000);
    expect(result.allowed).toBe(true);
  });

  it('tracks separate keys independently', () => {
    checkRateLimitInMemory('ip-a', 1, 60_000);
    const blockedA = checkRateLimitInMemory('ip-a', 1, 60_000);
    const freshB = checkRateLimitInMemory('ip-b', 1, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(freshB.allowed).toBe(true);
  });

  it('returns positive resetMs when blocked', () => {
    checkRateLimitInMemory('ip1', 1, 5_000);
    const blocked = checkRateLimitInMemory('ip1', 1, 5_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetMs).toBeGreaterThan(0);
    expect(blocked.resetMs).toBeLessThanOrEqual(5_000);
  });

  it('returns time until the oldest request expires on an allowed response', () => {
    checkRateLimitInMemory('ip1', 5, 10_000); // t=0, oldest request
    vi.advanceTimersByTime(4_000);
    const result = checkRateLimitInMemory('ip1', 5, 10_000); // t=4000, still allowed
    expect(result.allowed).toBe(true);
    // Oldest request (t=0) expires at t=10_000, so 6_000ms remain from t=4_000
    expect(result.resetMs).toBe(6_000);
  });

  it('resets the window after partial expiry — sliding, not fixed', () => {
    // t=0: request 1, t=500: request 2, t=1001: request 1 expires
    // at t=1001 we should be allowed again (only request 2 remains)
    const window = 1_000;
    checkRateLimitInMemory('ip1', 2, window); // t=0
    vi.advanceTimersByTime(500);
    checkRateLimitInMemory('ip1', 2, window); // t=500 — fills limit
    vi.advanceTimersByTime(501); // t=1001 — first request expires
    const result = checkRateLimitInMemory('ip1', 2, window); // t=1001
    expect(result.allowed).toBe(true);
  });
});

// --- checkRateLimit: Redis path with in-memory fallback ---

describe('checkRateLimit without Upstash env vars configured', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the in-memory limiter directly', async () => {
    const mod = await import('./rate-limit');
    const result = await mod.checkRateLimit('ip1', 2, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});

describe('checkRateLimit with Upstash configured', () => {
  const mockLimit = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');

    vi.doMock('@upstash/redis', () => ({
      Redis: vi.fn().mockImplementation(function RedisMock() {
        return {};
      }),
    }));
    vi.doMock('@upstash/ratelimit', () => {
      const RatelimitMock = vi
        .fn()
        .mockImplementation(function RatelimitCtorMock() {
          return { limit: mockLimit };
        }) as unknown as {
        (): { limit: typeof mockLimit };
        slidingWindow: (...args: unknown[]) => unknown;
      };
      RatelimitMock.slidingWindow = vi.fn();
      return { Ratelimit: RatelimitMock };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('@upstash/redis');
    vi.doUnmock('@upstash/ratelimit');
    vi.useRealTimers();
  });

  it('uses the Redis result when the call succeeds', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 12_345,
    });
    const mod = await import('./rate-limit');
    const result = await mod.checkRateLimit('ip1', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(mockLimit).toHaveBeenCalledWith('ip1');
  });

  it('reports blocked when Redis says the limit is exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 5_000,
    });
    const mod = await import('./rate-limit');
    const result = await mod.checkRateLimit('ip1', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('falls back to in-memory when the Redis call rejects', async () => {
    mockLimit.mockRejectedValue(new Error('network error'));
    const mod = await import('./rate-limit');
    const result = await mod.checkRateLimit('ip1', 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('falls back to in-memory when the Redis call times out', async () => {
    vi.useFakeTimers();
    mockLimit.mockReturnValue(new Promise(() => {})); // never resolves
    const mod = await import('./rate-limit');
    const resultPromise = mod.checkRateLimit('ip1', 3, 60_000);
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await resultPromise;
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
