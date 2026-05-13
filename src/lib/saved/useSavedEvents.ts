"use client";

import { useCallback, useEffect, useState } from "react";
import { readSavedIds, writeSavedIds } from "./storage";

// Single source of truth for the heart-state across cards, detail page, and
// profile tab. Signed-in users round-trip to the DB; anonymous users persist
// in localStorage. Components subscribe via a window event so unsaving from
// /profile updates open card hearts without a hard reload.
export function useSavedEvents(): {
  ready: boolean;
  ids: Set<string>;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
  authed: boolean | null;
} {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const hydrate = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-events", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { authed: boolean; ids: string[] };
        setAuthed(data.authed);
        if (data.authed) {
          setIds(new Set(data.ids));
          setReady(true);
          return;
        }
      }
    } catch {
      // Network/server unavailable — fall through to localStorage.
    }
    setAuthed(false);
    setIds(new Set(readSavedIds()));
    setReady(true);
  }, []);

  useEffect(() => {
    hydrate();
    const onChange = () => {
      // Re-read from localStorage for anonymous users; signed-in stays
      // authoritative from server but may benefit from a refresh too.
      if (authed) {
        hydrate();
      } else {
        setIds(new Set(readSavedIds()));
      }
    };
    window.addEventListener("festlio:saved-changed", onChange);
    return () => window.removeEventListener("festlio:saved-changed", onChange);
  }, [authed, hydrate]);

  const broadcast = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("festlio:saved-changed"));
    }
  };

  const toggle = useCallback(
    async (eventId: string) => {
      const currentlySaved = ids.has(eventId);
      // Optimistic update.
      setIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(eventId);
        else next.add(eventId);
        return next;
      });

      if (authed) {
        try {
          const res = await fetch(`/api/saved-events/${eventId}`, {
            method: currentlySaved ? "DELETE" : "POST",
          });
          if (!res.ok) throw new Error("save-failed");
          broadcast();
        } catch {
          // Roll back on failure.
          setIds((prev) => {
            const next = new Set(prev);
            if (currentlySaved) next.add(eventId);
            else next.delete(eventId);
            return next;
          });
        }
      } else {
        const current = readSavedIds();
        const next = currentlySaved
          ? current.filter((id) => id !== eventId)
          : [...current, eventId];
        writeSavedIds(next);
      }
    },
    [ids, authed]
  );

  const isSaved = useCallback((id: string) => ids.has(id), [ids]);

  return { ready, ids, isSaved, toggle, authed };
}
