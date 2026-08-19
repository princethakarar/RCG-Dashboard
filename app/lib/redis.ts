import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Treat missing / placeholder config as "caching disabled" so the app runs
// (and stays fast) without Upstash. Without this, an unreachable placeholder
// host triggers a slow DNS failure on every request. Add real Upstash creds
// and caching turns back on automatically.
export const REDIS_ENABLED =
  !!REDIS_URL &&
  !!REDIS_TOKEN &&
  REDIS_URL.startsWith('https://') &&
  !REDIS_URL.includes('disabled.upstash.io');

// Silent stand-in used when Redis isn't configured. Mirrors the get/set/del
// methods this app calls and resolves instantly with no network I/O, so every
// caller cleanly falls back to Supabase.
const noopRedis = {
  get: async () => null,
  set: async () => null,
  del: async () => 0,
} as unknown as Redis;

// Upstash Redis REST client singleton (or the no-op stub when unconfigured)
const redis: Redis = REDIS_ENABLED
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : noopRedis;

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_3X: 'dashboard:3x',
  DASHBOARD_NET_ASSET: 'dashboard:net-asset',
  DASHBOARD_FORECAST: 'dashboard:forecast',
  DASHBOARD_FILES: 'dashboard:files',
  DASHBOARD_TRADING: 'dashboard:trading_data',
  // Not user-scoped: nifty_ohlc is a single shared index series (see schema.sql).
  NIFTY_OHLC: 'dashboard:nifty_ohlc',
} as const;

// Default TTL: 24 hours in seconds
const DEFAULT_TTL = 60 * 60 * 24;

/**
 * Get cached data by key. Returns null on miss or error.
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch (err) {
    console.error(`[redis] GET ${key} failed:`, err);
    return null;
  }
}

/**
 * Set cached data with optional TTL (defaults to 24h).
 */
export async function setCachedData<T>(key: string, data: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, data, { ex: ttlSeconds });
  } catch (err) {
    console.error(`[redis] SET ${key} failed:`, err);
  }
}

/**
 * Invalidate (delete) one or more cache keys.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[redis] Invalidated cache keys: ${keys.join(', ')}`);
    }
  } catch (err) {
    console.error(`[redis] DEL failed:`, err);
  }
}

export default redis;
