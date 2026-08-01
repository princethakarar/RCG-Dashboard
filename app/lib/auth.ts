import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { getCachedData, setCachedData, invalidateCache } from './redis';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_please_change_in_prod';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'auth_token';

// Redis cache key prefix for per-user credentials
const CACHE_KEY_USER_PREFIX = 'auth:user:';

// Columns every user lookup selects. Kept in one place so the Redis-cached
// shape and the direct-by-id shape never drift apart.
const USER_COLUMNS = 'id, email, username, password_hash, password_version';
// Pre-username column set. Only used if the schema.sql `users.username`
// migration hasn't been applied yet, so a deploy that lands ahead of the
// migration can't lock everyone out of login.
const LEGACY_USER_COLUMNS = 'id, email, password_hash, password_version';
// Postgres "undefined column" (reads) / PostgREST "column not in schema cache" (writes)
const UNDEFINED_COLUMN = '42703';
const UNKNOWN_COLUMN_CACHED = 'PGRST204';

/**
 * Selects one user row by an indexed column, tolerating a database that
 * predates the `username` column.
 */
async function selectUser(column: 'id' | 'email', value: string): Promise<UserRecord | null> {
  const { data, error } = await supabase.from('users').select(USER_COLUMNS).eq(column, value).single();

  if (!error && data) {
    return data;
  }

  if (error?.code !== UNDEFINED_COLUMN) {
    return null;
  }

  console.warn('[auth] users.username is missing - run the schema.sql migration. Falling back to legacy columns.');
  const legacy = await supabase.from('users').select(LEGACY_USER_COLUMNS).eq(column, value).single();

  if (legacy.error || !legacy.data) {
    return null;
  }

  return { ...legacy.data, username: null };
}

export interface UserRecord {
  id: string;
  email: string;
  /** Null for accounts created before the explicit register flow existed. */
  username: string | null;
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
  // Entries written before `username` existed are treated as stale so the
  // display name isn't missing for up to a full cache TTL after deploy.
  if (cached && cached.username !== undefined) {
    return cached;
  }

  const user = await selectUser('email', normalizedEmail);
  if (!user) {
    return null;
  }

  await setCachedData(cacheKey, user, 600);
  return user;
}

/**
 * Fetch a user's credentials by id (used when re-checking password version).
 */
export async function getUserById(userId: string): Promise<UserRecord | null> {
  return selectUser('id', userId);
}

/**
 * Thrown when a registration targets an email that already has an account.
 */
export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists. Please log in instead.');
    this.name = 'EmailTakenError';
  }
}

/**
 * Creates a new user account with its own username and password (registration).
 */
export async function createUser(email: string, password: string, username: string): Promise<UserRecord> {
  const normalizedEmail = email.toLowerCase();
  const hash = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({ email: normalizedEmail, username, password_hash: hash, password_version: 1 })
    .select(USER_COLUMNS)
    .single();

  if (error || !data) {
    // 23505 = unique violation on users.email (two registrations racing, or a
    // stale read of the existing-account check).
    if (error?.code === '23505') {
      throw new EmailTakenError();
    }
    console.error('[auth] Failed to create user:', error);
    if (error?.code === UNDEFINED_COLUMN || error?.code === UNKNOWN_COLUMN_CACHED) {
      throw new Error('Registration is unavailable: the users.username column is missing. Apply the schema.sql migration.');
    }
    throw new Error('Failed to create user account');
  }

  return data;
}

/**
 * The name to show in the UI for an account. Accounts created under the old
 * auto-create-on-login flow have no username, so fall back to the email prefix
 * and finally to a generic label.
 */
export function resolveDisplayName(username: string | null | undefined, email: string | null | undefined): string {
  const name = (username || '').trim();
  if (name) {
    return name;
  }

  const prefix = (email || '').split('@')[0].trim();
  return prefix || 'User';
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
