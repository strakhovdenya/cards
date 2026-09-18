// In-memory sliding window rate limiter for Next.js Edge Middleware.
// State persists across warm Edge Runtime invocations within a single instance;
// cold starts reset the counters — acceptable for burst protection without external storage.

// Per-key sorted arrays of request timestamps (ms since epoch)
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

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the oldest in-window request expires (i.e. earliest retry time) */
  resetMs: number;
}

/**
 * Checks and records a request against a sliding window rate limit.
 *
 * @param key        Unique identifier for the rate-limit bucket (e.g. "guest-api:1.2.3.4")
 * @param maxRequests Maximum allowed requests in the window
 * @param windowMs   Window size in milliseconds
 */
export function checkRateLimit(
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
