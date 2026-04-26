"use client";

import { useEffect, useRef, useState } from "react";
import type { LinkedEventSummary } from "@/types/discussions";

interface EventPickerProps {
  value: LinkedEventSummary | null;
  onChange: (event: LinkedEventSummary | null) => void;
}

export function EventPicker({ value, onChange }: EventPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkedEventSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/events/search?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        if (!cancelled) setResults(data.events ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-xl p-3">
        <span
          className="material-symbols-outlined text-primary text-[20px]"
          aria-hidden="true"
        >
          event
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-body text-sm font-semibold text-on-surface truncate">
            {value.name}
          </div>
          <div className="font-body text-xs text-secondary truncate">
            {new Date(value.startDate).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
            })}
            {value.venueName ? ` · ${value.venueName}` : ` · ${value.city}`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove linked event"
          className="text-secondary hover:bg-surface-container rounded-full p-1"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            close
          </span>
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <span
        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[20px]"
        aria-hidden="true"
      >
        search
      </span>
      <label htmlFor="event-search" className="sr-only">
        Search Eventure events
      </label>
      <input
        id="event-search"
        type="search"
        placeholder="Search Eventure events…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-11 pr-4 text-sm font-body text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="p-3 font-body text-sm text-secondary">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 font-body text-sm text-secondary">
              No events match. Try a different name or skip — you can link one later.
            </div>
          ) : (
            results.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  onChange(event);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left flex items-center gap-3 p-3 hover:bg-surface-container-low transition-colors"
              >
                <span
                  className="material-symbols-outlined text-secondary text-[20px]"
                  aria-hidden="true"
                >
                  event
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm font-semibold text-on-surface truncate">
                    {event.name}
                  </div>
                  <div className="font-body text-xs text-secondary truncate">
                    {new Date(event.startDate).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })}
                    {event.venueName ? ` · ${event.venueName}` : ` · ${event.city}`}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      <p className="mt-2 font-body text-xs text-secondary">
        Optional. Link an event so it shows up on that event&apos;s page too.
      </p>
    </div>
  );
}
