"use client";

import { useState, useEffect } from 'react';

// Reuses the same /api/auth/me session endpoint TopNav already calls.
// Returns null until the session has loaded, so callers can show a placeholder.
export function useCurrentUsername(): string | null {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && data?.username) setUsername(data.username);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return username;
}
