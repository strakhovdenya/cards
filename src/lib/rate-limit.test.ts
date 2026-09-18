import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RateLimitResult } from './rate-limit';

// Each test gets a fresh module so the in-memory store starts empty
let checkRateLimit: (
  key: string,
  maxRequests: number,
  windowMs: number
) => RateLimitResult;

describe('checkRateLimit', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import('./rate-limit');
    checkRateLimit = mod.checkRateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request and decrements remaining', () => {
    const result = checkRateLimit('ip1', 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks a request that exceeds the limit', () => {
    checkRateLimit('ip1', 2, 60_000);
    checkRateLimit('ip1', 2, 60_000);
    const third = checkRateLimit('ip1', 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('returns remaining = 0 on the last allowed request', () => {
    checkRateLimit('ip1', 2, 60_000);
    const last = checkRateLimit('ip1', 2, 60_000);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
  });

  it('allows again after the window expires', () => {
    checkRateLimit('ip1', 1, 1_000);
    vi.advanceTimersByTime(1_001);
    const result = checkRateLimit('ip1', 1, 1_000);
    expect(result.allowed).toBe(true);
  });

  it('tracks separate keys independently', () => {
    checkRateLimit('ip-a', 1, 60_000);
    const blockedA = checkRateLimit('ip-a', 1, 60_000);
    const freshB = checkRateLimit('ip-b', 1, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(freshB.allowed).toBe(true);
  });

  it('returns positive resetMs when blocked', () => {
    checkRateLimit('ip1', 1, 5_000);
    const blocked = checkRateLimit('ip1', 1, 5_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetMs).toBeGreaterThan(0);
    expect(blocked.resetMs).toBeLessThanOrEqual(5_000);
  });

  it('returns time until the oldest request expires on an allowed response', () => {
    checkRateLimit('ip1', 5, 10_000); // t=0, oldest request
    vi.advanceTimersByTime(4_000);
    const result = checkRateLimit('ip1', 5, 10_000); // t=4000, still allowed
    expect(result.allowed).toBe(true);
    // Oldest request (t=0) expires at t=10_000, so 6_000ms remain from t=4_000
    expect(result.resetMs).toBe(6_000);
  });

  it('resets the window after partial expiry — sliding, not fixed', () => {
    // t=0: request 1, t=500: request 2, t=1001: request 1 expires
    // at t=1001 we should be allowed again (only request 2 remains)
    const window = 1_000;
    checkRateLimit('ip1', 2, window); // t=0
    vi.advanceTimersByTime(500);
    checkRateLimit('ip1', 2, window); // t=500 — fills limit
    vi.advanceTimersByTime(501); // t=1001 — first request expires
    const result = checkRateLimit('ip1', 2, window); // t=1001
    expect(result.allowed).toBe(true);
  });
});
