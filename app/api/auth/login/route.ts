import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings, verifyPassword, signJWT, COOKIE_NAME } from '../../../lib/auth';

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

    // Get current hash and version from database
    const settings = await getSiteSettings();

    // Verify password against hash
    const isValid = verifyPassword(password, settings.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Sign the JWT
    const token = await signJWT(email, settings.password_version);

    // Set cookie
    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
    
    // Cookie options: 24 hours
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
