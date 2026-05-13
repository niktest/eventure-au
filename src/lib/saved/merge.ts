"use client";

import { clearSavedIds, readSavedIds } from "./storage";

// Call right after a successful sign-in / sign-up. Best-effort: any error is
// swallowed so a momentary network blip doesn't block the redirect — the
// saves remain in localStorage and will be merged on the next attempt.
export async function mergeSavedEventsFromLocalStorage(): Promise<void> {
  const ids = readSavedIds();
  if (ids.length === 0) return;
  try {
    const res = await fetch("/api/saved-events/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: ids }),
    });
    if (res.ok) {
      clearSavedIds();
    }
  } catch {
    // Swallow — keep localStorage so we retry next sign-in.
  }
}
