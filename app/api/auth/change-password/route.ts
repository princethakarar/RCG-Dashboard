import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserPassword, verifyJWT, COOKIE_NAME } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Basic protection: must be logged in (with valid current password version) to change password
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No session token found' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session token' }, { status: 401 });
    }

    const currentUser = await getUserById(payload.userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized: Account not found' }, { status: 401 });
    }
    if (payload.passwordVersion !== currentUser.password_version) {
      return NextResponse.json({ error: 'Unauthorized: Session has expired' }, { status: 401 });
    }

    // Parse request body
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Update this user's own password and increment their version
    const newVersion = await updateUserPassword(payload.userId, payload.email, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Your other active sessions have been signed out.',
      newVersion,
    });
  } catch (error: unknown) {
    console.error('[change-password-route] Error changing password:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to update password' }, { status: 500 });
  }
}
