import { NextRequest } from 'next/server';
import { verifyJWT, COOKIE_NAME } from './auth';

/**
 * Extract the authenticated user's ID from the JWT in the request.
 * Throws if not authenticated.
 */
export async function getUserId(req: NextRequest): Promise<string> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const payload = await verifyJWT(token);
  if (!payload || !payload.userId) {
    throw new Error('Invalid or expired session');
  }

  return payload.userId;
}

/**
 * Extract the authenticated user's email from the JWT in the request.
 * Throws if not authenticated.
 */
export async function getUserEmail(req: NextRequest): Promise<string> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const payload = await verifyJWT(token);
  if (!payload || !payload.email) {
    throw new Error('Invalid or expired session');
  }

  return payload.email;
}
