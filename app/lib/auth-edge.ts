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

interface SiteSettingsResponse {
  password_version: number;
}

/**
 * Fetch password version using pure Edge-compatible fetch.
 * First tries Upstash Redis (if configured) via REST API,
 * then falls back to Supabase Rest API.
 */
export async function getCachedPasswordVersion(): Promise<number> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/get/auth:site_settings`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as RedisGetResult;
        if (json && json.result) {
          const parsed = JSON.parse(json.result) as SiteSettingsResponse;
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
    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=password_version&order=id.asc&limit=1`, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[auth-edge] site_settings table not found or query failed (${res.status}). Falling back to version 1.`);
      return 1;
    }

    const data = (await res.json()) as SiteSettingsResponse[];
    if (!data || data.length === 0) {
      return 1;
    }

    return data[0].password_version;
  } catch (err) {
    console.error('[auth-edge] Failed site settings fetch fallback:', err);
    return 1;
  }
}

export { COOKIE_NAME };
