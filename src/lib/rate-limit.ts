// Sliding-window rate limiter. Uses Upstash Redis (shared across all Edge instances)
// when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are configured, and falls back
// to an in-memory, per-instance limiter when Redis is not configured or a call to it
// fails or times out — burst protection degrades instead of failing open or blocking
// every request.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the oldest in-window request expires (i.e. earliest retry time) */
  resetMs: number;
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_CALL_TIMEOUT_MS = 1_500;

const redis =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN, retry: { retries: 0 } })
    : null;

// One Ratelimit instance per distinct (maxRequests, windowMs) pair, created lazily.
const limiters = new Map<string, Ratelimit>();

function getLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${maxRequests}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        maxRequests,
        `${Math.max(1, Math.round(windowMs / 1000))} s`
      ),
      analytics: false,
      prefix: 'cards-rl',
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('rate limit Redis call timed out'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

/**
 * Checks and records a request against a sliding window rate limit, preferring
 * Upstash Redis (shared across instances) and falling back to an in-memory,
 * per-instance limiter when Redis is unconfigured, errors, or times out.
 *
 * @param key        Unique identifier for the rate-limit bucket (e.g. "guest-api:1.2.3.4")
 * @param maxRequests Maximum allowed requests in the window
 * @param windowMs   Window size in milliseconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const limiter = getLimiter(maxRequests, windowMs);
  if (limiter) {
    try {
      const result = await withTimeout(
        limiter.limit(key),
        REDIS_CALL_TIMEOUT_MS
      );
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetMs: Math.max(0, result.reset - Date.now()),
      };
    } catch (error) {
      console.error(
        'Rate limit: Redis check failed, falling back to in-memory limiter:',
        error
      );
    }
  }
  return checkRateLimitInMemory(key, maxRequests, windowMs);
}

// Per-key sorted arrays of request timestamps (ms since epoch). Fallback store used
// when Redis is unconfigured or unreachable — state is per Edge instance, so the
// effective limit can be higher than configured when traffic spreads across instances.
const store = new Map<string, number[]>();

let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60_000;
// Conservative upper bound covering all configured windows (auth = 5 min, guest = 1 min)
const MAX_WINDOW_MS = 10 * 60_000;

function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  const cutoff = now - MAX_WINDOW_MS;
  for (const [key, timestamps] of store) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) {
      store.delete(key);
    } else {
      store.set(key, fresh);
    }
  }
}

export function checkRateLimitInMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  maybeCleanup();

  const windowStart = now - windowMs;
  const prev = store.get(key) ?? [];
  // Keep only timestamps inside the current window
  const inWindow = prev.filter((t) => t > windowStart);

  if (inWindow.length >= maxRequests) {
    // inWindow is sorted ascending; oldest entry is index 0
    const resetMs = Math.max(0, inWindow[0] + windowMs - now);
    return { allowed: false, remaining: 0, resetMs };
  }

  inWindow.push(now);
  store.set(key, inWindow);
  return {
    allowed: true,
    remaining: maxRequests - inWindow.length,
    // Time until the oldest in-window request rolls out of the window
    resetMs: Math.max(0, inWindow[0] + windowMs - now),
  };
}
