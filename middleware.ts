import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, COOKIE_NAME, getUserPasswordVersion } from './app/lib/auth-edge';
import { isPageVisibleToUser, getLandingPath, DEFAULT_LANDING_PATH } from './app/lib/pageAccessConfig';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const isProtectedPath =
    pathname.startsWith('/intern-portfolio') ||
    pathname.startsWith('/net-asset') ||
    pathname.startsWith('/upload') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/update-security-config-31f2') ||
    pathname.startsWith('/api/portfolio-data') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/api/max-upside-downside');

  if (!isProtectedPath) {
    // If user is already logged in with a valid session and tries to access /login or /register, redirect to dashboard
    if (pathname === '/login' || pathname === '/register') {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifyJWT(token);
        if (payload) {
          try {
            const currentVersion = await getUserPasswordVersion(payload.userId, payload.email);
            if (payload.passwordVersion === currentVersion) {
              return NextResponse.redirect(new URL(getLandingPath(payload.email), request.url));
            }
          } catch (err) {
            // Ignore error, proceed to login page
          }
        }
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Helper to handle unauthorized requests
  const handleUnauthorized = () => {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid or expired' }, { status: 401 });
    }
    
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear the stale cookie
    response.cookies.delete(COOKIE_NAME);
    return response;
  };

  if (!token) {
    return handleUnauthorized();
  }

  // Verify JWT
  const payload = await verifyJWT(token);
  if (!payload) {
    return handleUnauthorized();
  }

  // Fetch current site settings (leverages Upstash Redis caching)
  try {
    const currentVersion = await getUserPasswordVersion(payload.userId, payload.email);

    // Check if password version matches
    if (payload.passwordVersion !== currentVersion) {
      console.warn(`[middleware] Stale password version ${payload.passwordVersion} (current: ${currentVersion}). Revoking session.`);
      return handleUnauthorized();
    }
  } catch (err) {
    console.error('[middleware] Failed site settings check during auth:', err);
    // If the database check fails completely, let request pass to prevent absolute blocking (or reject for safety).
    // For maximum safety, we allow it if we have verified the JWT signature, but log the error.
  }

  // Per-page access control (see pageAccessConfig). Keeps a restricted
  // dashboard unreachable by URL, not just hidden from the nav.
  if (pathname.startsWith('/intern-portfolio') && !isPageVisibleToUser('/intern-portfolio', payload.email)) {
    return NextResponse.redirect(new URL(DEFAULT_LANDING_PATH, request.url));
  }

  return NextResponse.next();
}

// See Next.js middleware documentation for matcher format
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
