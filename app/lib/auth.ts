import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { getCachedData, setCachedData, invalidateCache } from './redis';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_please_change_in_prod';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'auth_token';

// Redis cache key prefix for per-user credentials
const CACHE_KEY_USER_PREFIX = 'auth:user:';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  password_version: number;
}

export interface JWTPayload {
  email: string;
  passwordVersion: number;
  userId: string;
}

/**
 * Fetch a user's credentials by email, with Redis caching. Returns null if
 * no account exists for that email yet.
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.toLowerCase();
  const cacheKey = `${CACHE_KEY_USER_PREFIX}${normalizedEmail}`;

  const cached = await getCachedData<UserRecord>(cacheKey);
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, password_hash, password_version')
    .eq('email', normalizedEmail)
    .single();

  if (error || !data) {
    return null;
  }

  const user: UserRecord = data;
  await setCachedData(cacheKey, user, 600);
  return user;
}

/**
 * Fetch a user's credentials by id (used when re-checking password version).
 */
export async function getUserById(userId: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, password_hash, password_version')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Creates a new user account with its own password (first-login signup).
 */
export async function createUser(email: string, password: string): Promise<UserRecord> {
  const normalizedEmail = email.toLowerCase();
  const hash = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({ email: normalizedEmail, password_hash: hash, password_version: 1 })
    .select('id, email, password_hash, password_version')
    .single();

  if (error || !data) {
    console.error('[auth] Failed to create user:', error);
    throw new Error('Failed to create user account');
  }

  return data;
}

/**
 * Updates a single user's password and invalidates their cache entry.
 */
export async function updateUserPassword(userId: string, email: string, newPassword: string): Promise<number> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const nextVersion = user.password_version + 1;
  const hash = bcrypt.hashSync(newPassword, 10);

  const { error } = await supabase
    .from('users')
    .update({
      password_hash: hash,
      password_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('password_version', user.password_version); // optimistic locking

  if (error) {
    console.error('[auth] Failed to update password:', error);
    throw new Error('Failed to update password');
  }

  await invalidateCache(`${CACHE_KEY_USER_PREFIX}${email.toLowerCase()}`);

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
export async function signJWT(email: string, passwordVersion: number, userId: string): Promise<string> {
  return new SignJWT({ email, passwordVersion, userId })
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
