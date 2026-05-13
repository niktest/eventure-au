"use client";

// Anonymous saved-event IDs live in localStorage so the ♥ works pre-auth.
// On sign-in we POST these to /api/saved-events/merge and then clear the key.
export const SAVED_STORAGE_KEY = "festlio_saved_events";

export function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeSavedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(ids));
  localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(unique));
  window.dispatchEvent(new CustomEvent("festlio:saved-changed"));
}

export function clearSavedIds() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVED_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("festlio:saved-changed"));
}
