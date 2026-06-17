import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { getCachedData, setCachedData, invalidateCache } from './redis';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_please_change_in_prod';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'auth_token';

// Redis cache key for settings
const CACHE_KEY_SETTINGS = 'auth:site_settings';

export interface SiteSettings {
  password_hash: string;
  password_version: number;
}

export interface JWTPayload {
  email: string;
  passwordVersion: number;
}

/**
 * Fetch settings from DB with Redis fallback.
 * If no settings exist, seeds a default password "RCG@2030".
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  // Try Redis cache first
  const cached = await getCachedData<SiteSettings>(CACHE_KEY_SETTINGS);
  if (cached) {
    return cached;
  }

  // Query Supabase
  const { data: initialData, error } = await supabase
    .from('site_settings')
    .select('password_hash, password_version')
    .order('id', { ascending: true })
    .limit(1);

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('[auth] WARNING: site_settings table not found in Supabase. Falling back to default password "RCG@2030" (version 1). Please execute the SQL schema in Supabase to enable persistence and password updates.');
      const fallbackSettings: SiteSettings = {
        password_hash: bcrypt.hashSync('RCG@2030', 10),
        password_version: 1,
      };
      return fallbackSettings;
    }
    console.error('[auth] Error fetching site settings:', error);
    throw new Error('Database fetch failed');
  }

  let data = initialData;

  // Seed default if settings table is empty
  if (!data || data.length === 0) {
    console.log('[auth] site_settings table empty. Seeding default settings...');
    const defaultPassword = 'RCG@2030';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);
    const defaultSettings = {
      password_hash: hash,
      password_version: 1,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('site_settings')
      .insert([defaultSettings])
      .select('password_hash, password_version')
      .single();

    if (insertError) {
      console.error('[auth] Seeding default settings failed:', insertError);
      // Fallback to locally computed version to prevent complete denial of service
      return defaultSettings;
    }
    data = [inserted];
  }

  const settings: SiteSettings = {
    password_hash: data[0].password_hash,
    password_version: data[0].password_version,
  };

  // Cache in Redis for 10 minutes (or longer, invalidated on change)
  await setCachedData(CACHE_KEY_SETTINGS, settings, 600);

  return settings;
}

/**
 * Update the default password in the database and invalidate the cache.
 */
export async function updateDefaultPassword(newPassword: string): Promise<number> {
  const settings = await getSiteSettings();
  const nextVersion = settings.password_version + 1;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);

  // Update existing row or insert if somehow none exists
  const { error } = await supabase
    .from('site_settings')
    .update({
      password_hash: hash,
      password_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('password_version', settings.password_version); // optimistic locking

  if (error) {
    console.error('[auth] Failed to update password:', error);
    throw new Error('Failed to update password');
  }

  // Invalidate cache
  await invalidateCache(CACHE_KEY_SETTINGS);

  return nextVersion;
}

/**
 * Verifies if the password matches the hash.
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Generates a JWT token for the user session.
 */
export async function signJWT(email: string, passwordVersion: number): Promise<string> {
  return new SignJWT({ email, passwordVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // 24 hours session validity
    .sign(SECRET_KEY);
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

export { COOKIE_NAME };
