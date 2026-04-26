/**
 * In-memory token bucket. Fits within a single Vercel runtime; resets on cold
 * start. Acceptable for v1 — the goal is "stop someone scripting from a
 * browser tab", not distributed throttling. Upgrade to Redis if traffic grows.
 */
type Bucket = { tokens: number; updatedAt: number };

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitConfig {
  capacity: number;
  refillPerSec: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now()
): { allowed: boolean; retryAfterSec: number } {
  const existing = BUCKETS.get(key);
  if (!existing) {
    BUCKETS.set(key, { tokens: config.capacity - 1, updatedAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  const elapsedSec = (now - existing.updatedAt) / 1000;
  const refilled = Math.min(
    config.capacity,
    existing.tokens + elapsedSec * config.refillPerSec
  );
  if (refilled < 1) {
    const tokensNeeded = 1 - refilled;
    const retryAfterSec = Math.ceil(tokensNeeded / config.refillPerSec);
    BUCKETS.set(key, { tokens: refilled, updatedAt: now });
    return { allowed: false, retryAfterSec };
  }
  BUCKETS.set(key, { tokens: refilled - 1, updatedAt: now });
  return { allowed: true, retryAfterSec: 0 };
}

export const RL_THREADS_CREATE: RateLimitConfig = {
  capacity: 5,
  refillPerSec: 5 / 3600,
};
export const RL_REPLIES_CREATE: RateLimitConfig = {
  capacity: 30,
  refillPerSec: 30 / 3600,
};
export const RL_UPVOTES: RateLimitConfig = {
  capacity: 60,
  refillPerSec: 60 / 60,
};
export const RL_REPORTS: RateLimitConfig = {
  capacity: 10,
  refillPerSec: 10 / 3600,
};
