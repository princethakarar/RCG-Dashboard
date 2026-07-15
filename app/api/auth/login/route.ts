import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, verifyPassword, signJWT, COOKIE_NAME } from '../../../lib/auth';

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

    const existingUser = await getUserByEmail(email);

    let userId: string;
    let passwordVersion: number;

    if (existingUser) {
      // Returning user: verify against their own password.
      const isValid = verifyPassword(password, existingUser.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      userId = existingUser.id;
      passwordVersion = existingUser.password_version;
    } else {
      // First-time login for this email: create the account with the
      // password they just entered.
      if (password.length < 6) {
        return NextResponse.json({ error: 'New account password must be at least 6 characters long' }, { status: 400 });
      }
      const newUser = await createUser(email, password);
      userId = newUser.id;
      passwordVersion = newUser.password_version;
    }

    // Sign the JWT with userId
    const token = await signJWT(email, passwordVersion, userId);

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
