import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, getUserByEmail, resolveDisplayName, COOKIE_NAME } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyJWT(token);
  if (!payload || !payload.email) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  // The username lives on the user row (not in the JWT) so sessions issued
  // before this field existed still resolve a name. Read is Redis-cached.
  const user = await getUserByEmail(payload.email);

  return NextResponse.json({
    email: payload.email,
    userId: payload.userId,
    username: resolveDisplayName(user?.username, payload.email),
  });
}
