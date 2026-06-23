import { Redis } from '@upstash/redis';

// Upstash Redis REST client singleton
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_3X: 'dashboard:3x',
  DASHBOARD_NET_ASSET: 'dashboard:net-asset',
  DASHBOARD_FORECAST: 'dashboard:forecast',
  DASHBOARD_FILES: 'dashboard:files',
  DASHBOARD_TRADING: 'dashboard:trading_data',
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
