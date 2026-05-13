"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { EventCardData } from "@/lib/events/eventCardSelect";
import { EventCard } from "./EventCard";
import { readSavedIds } from "@/lib/saved/storage";

export function SavedEventsList() {
  const [events, setEvents] = useState<EventCardData[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const localIds = readSavedIds();
    const qs = localIds.length > 0 ? `?ids=${localIds.join(",")}` : "";
    try {
      const res = await fetch(`/api/saved-events/list${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setEvents([]);
        return;
      }
      const data = (await res.json()) as {
        authed: boolean;
        events: EventCardData[];
      };
      // Date strings come over the wire — coerce so EventCard's locale calls work.
      const hydrated = data.events.map((e) => ({
        ...e,
        startDate: new Date(e.startDate),
      }));
      setAuthed(data.authed);
      setEvents(hydrated);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("festlio:saved-changed", onChange);
    return () => window.removeEventListener("festlio:saved-changed", onChange);
  }, [refresh]);

  if (events === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-80 rounded-xl bg-surface-container-low animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-surface-bright rounded-xl border border-surface-container-high p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-4">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-on-surface mb-2">
          No saved events yet
        </h2>
        <p className="font-body text-secondary mb-6 max-w-md mx-auto">
          Tap the ♥ on any event to save it here. Your list is kept across
          devices once you sign in.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">explore</span>
          Browse Events
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-secondary">
          {events.length} saved {events.length === 1 ? "event" : "events"}
          {authed === false && (
            <>
              {" · "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in to keep them
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
