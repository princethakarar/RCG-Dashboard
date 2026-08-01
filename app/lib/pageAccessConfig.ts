// Per-page access control, mirroring STRATEGY_ACCESS_CONFIG. A `null` entry
// (or an unlisted path) means unrestricted. A string array restricts the page
// and its nav link to those emails only.
export const PAGE_ACCESS_CONFIG: Record<string, string[] | null> = {
  '/intern-portfolio': ['kiranmistry813@gmail.com'],
};

// Where a user is sent when they land on a page they can't see.
export const DEFAULT_LANDING_PATH = '/net-asset';

export function isPageVisibleToUser(path: string, userEmail?: string | null): boolean {
  const allowed = PAGE_ACCESS_CONFIG[path];
  if (!allowed) return true;
  if (!userEmail) return false;
  const normalizedEmail = userEmail.trim().toLowerCase();
  return allowed.some(e => e.toLowerCase() === normalizedEmail);
}

/**
 * The dashboard to send a user to after login, or when they hit `/`.
 */
export function getLandingPath(userEmail?: string | null): string {
  return isPageVisibleToUser('/intern-portfolio', userEmail) ? '/intern-portfolio' : DEFAULT_LANDING_PATH;
}
