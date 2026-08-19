import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_please_change_in_prod';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'auth_token';

export interface JWTPayload {
  email: string;
  passwordVersion: number;
  userId: string;
}

/**
 * Verifies a JWT token and returns the payload.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

interface RedisGetResult {
  result: string | null;
}

interface UserVersionResponse {
  password_version: number;
}

/**
 * Fetch a user's current password_version using pure Edge-compatible fetch.
 * First tries Upstash Redis (if configured) via REST API, keyed by the same
 * cache key auth.ts uses for that user's email, then falls back to the
 * Supabase REST API by user id.
 */
export async function getUserPasswordVersion(userId: string, email: string): Promise<number> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Skip Redis entirely when it isn't really configured (missing or a disabled
  // placeholder). Avoids a slow DNS failure on every protected request; the
  // Supabase REST fallback below handles it. Real creds re-enable this path.
  const redisEnabled =
    !!redisUrl &&
    !!redisToken &&
    redisUrl.startsWith('https://') &&
    !redisUrl.includes('disabled.upstash.io');

  if (redisEnabled) {
    try {
      const cacheKey = `auth:user:${email.toLowerCase()}`;
      const res = await fetch(`${redisUrl}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as RedisGetResult;
        if (json && json.result) {
          const parsed = JSON.parse(json.result) as UserVersionResponse;
          if (parsed && typeof parsed.password_version === 'number') {
            return parsed.password_version;
          }
        }
      }
    } catch (err) {
      console.error('[auth-edge] Redis fetch failed:', err);
    }
  }

  // Fallback: fetch from Supabase REST API directly via fetch (100% Edge safe)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing in Edge runtime');
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?select=password_version&id=eq.${userId}&limit=1`, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`users lookup failed with status ${res.status}`);
    }

    const data = (await res.json()) as UserVersionResponse[];
    if (!data || data.length === 0) {
      throw new Error(`no user found for id ${userId}`);
    }

    return data[0].password_version;
  } catch (err) {
    console.error('[auth-edge] Failed user version fetch fallback:', err);
    throw err;
  }
}

export { COOKIE_NAME };
