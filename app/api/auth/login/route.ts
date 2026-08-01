import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, signJWT, COOKIE_NAME } from '../../../lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Accounts are only ever created through /api/auth/register.
    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      return NextResponse.json({ error: 'No account found with this email. Please register first.' }, { status: 404 });
    }

    const isValid = verifyPassword(password, existingUser.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Sign the JWT with userId
    const token = await signJWT(existingUser.email, existingUser.password_version, existingUser.id);

    // Set cookie
    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: unknown) {
    console.error('[login-route] Login error:', error);
    return NextResponse.json({ error: 'An unexpected authentication error occurred' }, { status: 500 });
  }
}
