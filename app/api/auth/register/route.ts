import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, signJWT, EmailTakenError, COOKIE_NAME } from '../../../lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_USERNAME_LENGTH = 50;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email and password are required' }, { status: 400 });
    }

    const trimmedUsername = String(username).trim();
    if (trimmedUsername.length < 2 || trimmedUsername.length > MAX_USERNAME_LENGTH) {
      return NextResponse.json(
        { error: `Username must be between 2 and ${MAX_USERNAME_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Same minimum the login flow used for new accounts / change-password uses.
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 409 }
      );
    }

    const newUser = await createUser(email, password, trimmedUsername);

    // Log the new account straight in, using the same session mechanism as login.
    const token = await signJWT(newUser.email, newUser.password_version, newUser.id);

    const response = NextResponse.json({ success: true, message: 'Account created successfully' });

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
    if (error instanceof EmailTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[register-route] Registration error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'An unexpected error occurred while creating your account' },
      { status: 500 }
    );
  }
}
