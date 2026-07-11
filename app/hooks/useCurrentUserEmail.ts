"use client";

import { useState, useEffect } from 'react';

// Reuses the same /api/auth/me session endpoint TopNav already calls.
export function useCurrentUserEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && data?.email) setEmail(data.email);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return email;
}
