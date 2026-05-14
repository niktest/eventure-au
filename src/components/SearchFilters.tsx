"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { EventSearchAutocomplete } from "./EventSearchAutocomplete";

// Ring-buffer calendar (EVE-232) is heavy-ish and only mounts when opened.
const EventCalendar = dynamic(
  () => import("./calendar/EventCalendar").then((m) => m.EventCalendar),
  { ssr: false, loading: () => null }
);

/**
 * Free-text + date-range + free-only controls for /events.
 *
 * Category chips are NOT rendered here — they live in {@link HomepageCategoryRow},
 * the single canonical chip row shared with Home (EVE-229). Keeping chips in
 * one place is what stops Browse↔Home category state from drifting.
 */
export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `loading.tsx` doesn't fire on same-segment search-param changes, so we
  // surface the SSR roundtrip after a filter click via `isPending` —
  // dimmed controls + thin top progress bar (board feedback EVE-164).
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const currentQuery = searchParams?.get("q") ?? "";
  const currentDate = searchParams?.get("date") ?? "";
  const currentDateFrom = searchParams?.get("dateFrom") ?? "";
  const currentDateTo = searchParams?.get("dateTo") ?? "";
  // EVE-219: ?price=free is canonical; ?free=1 stays accepted as an alias.
  const currentFreeOnly =
    searchParams?.get("price") === "free" || searchParams?.get("free") === "1";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.push(`/events?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div
      data-pending={isPending ? "1" : undefined}
      className={`mb-8 space-y-4 transition-opacity ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      {isPending && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading events"
          className="fixed top-0 inset-x-0 h-0.5 bg-primary/30 z-50 overflow-hidden"
        >
          <div className="h-full w-1/3 bg-primary loading-bar" />
        </div>
      )}
      {/* Text search with live autocomplete; submit preserves URL filter state */}
      <div data-primary-search>
        <EventSearchAutocomplete
          inputId="event-search"
          placeholder="Search events, artists, venues..."
          initialQuery={currentQuery}
          wrapperClassName="relative w-full"
          iconClassName="material-symbols-outlined absolute left-3 top-3.5 text-secondary text-[20px] pointer-events-none"
          inputClassName="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 pl-10 font-body text-base text-on-surface placeholder:text-secondary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          onSubmit={(q) => updateParams({ q: q || null })}
        />
      </div>

      {/* Date range and free toggle */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-body font-semibold text-on-surface">From</span>
          <input
            type="date"
            defaultValue={currentDateFrom}
            onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-body font-semibold text-on-surface">To</span>
          <input
            type="date"
            defaultValue={currentDateTo}
            onChange={(e) => updateParams({ dateTo: e.target.value || null })}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            checked={currentFreeOnly}
            onChange={(e) =>
              // Write canonical ?price=free (EVE-219) and clear the legacy
              // ?free=1 param so toggling doesn't leave both in the URL.
              updateParams({
                price: e.target.checked ? "free" : null,
                free: null,
              })
            }
            className="rounded accent-primary"
          />
          <span className="font-body font-semibold text-on-surface">Free only</span>
        </label>

        {/* EVE-232 "Browse by date" toggle. Opens the ring-buffer calendar. */}
        <button
          type="button"
          aria-expanded={calendarOpen}
          aria-controls="event-calendar-surface"
          onClick={() => setCalendarOpen((v) => !v)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {calendarOpen ? "Hide calendar" : currentDate ? `Calendar — ${currentDate}` : "Browse by date"}
        </button>
      </div>

      {calendarOpen && (
        <div id="event-calendar-surface">
          <EventCalendar
            initialSelectedDate={currentDate || null}
            onClose={() => setCalendarOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
