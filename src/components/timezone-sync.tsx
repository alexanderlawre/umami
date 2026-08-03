"use client";

import { useEffect } from "react";

const CACHE_KEY = "umami:tz";

// Mounted once in the root layout. On mount, detects the browser's real IANA
// timezone and reports it to the server so the dashboard's meal-slot
// selection (see src/lib/meal-slot.ts) can use each user's actual local
// time instead of a fixed default. Caches the last-sent value in
// localStorage so this is a no-op fetch on most page loads, and silently
// no-ops entirely when logged out (the API route just 401s).
export function TimezoneSync() {
  useEffect(() => {
    let timezone: string;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!timezone) return;

    let cached: string | null = null;
    try {
      cached = window.localStorage.getItem(CACHE_KEY);
    } catch {
      // Ignore — private browsing / storage disabled.
    }
    if (cached === timezone) return;

    fetch("/api/user/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) {
          try {
            window.localStorage.setItem(CACHE_KEY, timezone);
          } catch {
            // Ignore.
          }
        }
      })
      .catch(() => {
        // Best-effort; a dropped sync just means we fall back to UTC-based
        // slot selection until the next successful sync.
      });
  }, []);

  return null;
}
