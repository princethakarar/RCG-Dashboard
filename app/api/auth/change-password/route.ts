import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings, updateDefaultPassword, verifyJWT, COOKIE_NAME } from '../../../lib/auth';

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

    const currentSettings = await getSiteSettings();
    if (payload.passwordVersion !== currentSettings.password_version) {
      return NextResponse.json({ error: 'Unauthorized: Session has expired' }, { status: 401 });
    }

    // Parse request body
    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Update the password in database and increment version
    const newVersion = await updateDefaultPassword(newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. All other active sessions have been invalidated.',
      newVersion,
    });
  } catch (error: unknown) {
    console.error('[change-password-route] Error changing password:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to update password' }, { status: 500 });
  }
}
