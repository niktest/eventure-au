"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  TIME_WINDOW_KEYS,
  TIME_WINDOW_LABELS,
  isTimeWindowKey,
  type TimeWindowKey,
} from "@/lib/events/timeWindows";

function chipClass(active: boolean): string {
  return [
    "rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors whitespace-nowrap",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    active
      ? "bg-primary text-on-primary"
      : "bg-surface-container-low text-on-surface hover:bg-surface-container",
  ].join(" ");
}

/**
 * Time-window chip row for list pages (EVE-208).
 *
 * Pushes `?when=<key>` onto the current URL. Resolution happens server-side
 * in `buildEventFilters`, so chips compose cleanly with other filters and
 * the resolved date range is timezone-aware (Australia/Sydney, DST-safe).
 *
 * Active-state detection:
 *  - `?when=<key>` matches that chip
 *  - the static `/today` route reads as "Today" so deep-linked SEO pages stay highlighted
 */
export function TimeWindowChips({
  ariaLabel = "Time window",
}: {
  ariaLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const whenParam = searchParams?.get("when");
  let activeKey: TimeWindowKey | null = null;
  if (isTimeWindowKey(whenParam)) {
    activeKey = whenParam;
  } else if (pathname === "/today") {
    activeKey = "today";
  }

  const onClick = (key: TimeWindowKey) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const toggleOff = activeKey === key;
    if (toggleOff) {
      params.delete("when");
    } else {
      params.set("when", key);
    }
    // Named windows are the canonical date filter — drop conflicting forms.
    params.delete("date");
    params.delete("dateFrom");
    params.delete("dateTo");

    // /today is a static SEO page; chip interactions belong on /events.
    const base = pathname === "/today" ? "/events" : pathname || "/events";
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${base}?${qs}` : base);
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-pending={isPending ? "1" : undefined}
      className={`flex flex-wrap gap-2 transition-opacity ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      {TIME_WINDOW_KEYS.map((key) => {
        const active = activeKey === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onClick(key)}
            className={chipClass(active)}
          >
            {TIME_WINDOW_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
