"use client";

/**
 * Event calendar with ring-buffer infinite scroll (EVE-232, wireframes EVE-228).
 *
 * Architecture:
 *   - `useReducer` over a ring-buffer state (see `monthRing.ts`): exactly
 *     WINDOW_SIZE month tiles ever exist in the DOM.
 *   - Selection (`selectedDateKey`) is the URL `?date=` param — it lives above
 *     the ring so recycling never clears it.
 *   - Focus (`focusedDateKey`) is component state — also above the ring; the
 *     roving-tabindex grid pattern reads from it.
 *   - IntersectionObserver on the leading/trailing tile advances the anchor;
 *     CSS `order` on each slot keeps paint order chronological so scroll
 *     position doesn't jump on recycle.
 *   - A short crossfade (120ms) on a slot's day-grid when its `rebindVersion`
 *     bumps signals "new content arrived" without disorienting the user. The
 *     sticky month header is driven by IO so it always reads true.
 *   - Reduced motion: collapses the crossfade to an instant swap.
 */

import {
  forwardRef,
  KeyboardEvent,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WINDOW_HALF,
  WINDOW_SIZE,
  addMonths,
  advanceAnchor,
  buildMonthGrid,
  densityLevel,
  initRingState,
  monthDiff,
  monthKeyOf,
  parseMonthKey,
  type MonthKey,
  type RingState,
} from "@/lib/calendar/monthRing";

const MONTH_FMT = new Intl.DateTimeFormat("en-AU", {
  month: "long",
  year: "numeric",
});
const FULL_DAY_FMT = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const PILL_DAY_FMT = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const WEEKDAYS_MON_FIRST = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Action =
  | { type: "set-anchor"; anchor: MonthKey }
  | { type: "step-anchor"; delta: number };

function reducer(state: RingState, action: Action): RingState {
  switch (action.type) {
    case "set-anchor":
      return advanceAnchor(state, action.anchor);
    case "step-anchor":
      return advanceAnchor(state, addMonths(state.anchorMonthKey, action.delta));
  }
}

function isoDateOf(year: number, month1Based: number, day: number): string {
  return `${year}-${String(month1Based).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateLabel(key: string): string {
  return FULL_DAY_FMT.format(parseDateKey(key));
}

function formatPillLabel(key: string): string {
  return PILL_DAY_FMT.format(parseDateKey(key));
}

export type EventCalendarProps = {
  /** ISO date `YYYY-MM-DD` to anchor on first mount; default = today. */
  initialAnchor?: string;
  /** ISO date selected on first mount; default = URL `?date=` or null. */
  initialSelectedDate?: string | null;
  /** Optional close handler so a parent can wrap this in a sheet/drawer. */
  onClose?: () => void;
  /** Override "today" for tests / Storybook. */
  todayOverride?: Date;
};

export function EventCalendar({
  initialAnchor,
  initialSelectedDate,
  onClose,
  todayOverride,
}: EventCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selection is sourced from the URL so deep links survive recycle/refresh.
  const urlDate = searchParams?.get("date") ?? null;
  const selectedDateKey = urlDate ?? initialSelectedDate ?? null;

  const today = todayOverride ?? new Date();
  const todayKey = isoDateOf(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const anchorSeed: MonthKey = initialAnchor
    ? initialAnchor.slice(0, 7)
    : selectedDateKey
    ? selectedDateKey.slice(0, 7)
    : monthKeyOf(today);

  const [ring, dispatch] = useReducer(reducer, undefined, () =>
    initRingState(anchorSeed)
  );

  // Focus is lifted above the ring; arrow keys move it without touching state
  // of recycled tiles.
  const [focusedDateKey, setFocusedDateKey] = useState<string>(
    selectedDateKey ?? todayKey
  );

  // Per-date event counts, keyed by YYYY-MM-DD. Fetched lazily for the inner
  // ±1 month band on anchor change; outer ring fills in via `requestIdleCallback`.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [stickyMonth, setStickyMonth] = useState<MonthKey>(ring.anchorMonthKey);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const slotElsRef = useRef<Array<HTMLElement | null>>(
    new Array(WINDOW_SIZE).fill(null)
  );

  // ------------- Event-count fetch -------------
  useEffect(() => {
    const ac = new AbortController();
    // Inner band (anchor ±1) is fetched eagerly so the user always sees dots
    // on what they're looking at; the outer ring is filled on idle below.
    void (async () => {
      try {
        const res = await fetch(
          `/api/events/month-counts?from=${addMonths(
            ring.anchorMonthKey,
            -1
          )}&to=${addMonths(ring.anchorMonthKey, 1)}`,
          { signal: ac.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { counts: Record<string, number> };
        setCounts((prev) => ({ ...prev, ...data.counts }));
      } catch {
        // ignore — calendar still renders without counts
      }
    })();

    // Outer ring — fetched on idle so we don't block the inner repaint.
    type IdleHandle = { id: number; cancel: () => void };
    const idle: IdleHandle = (() => {
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void) => number;
        cancelIdleCallback?: (h: number) => void;
      };
      if (w.requestIdleCallback) {
        const h = w.requestIdleCallback(() => fetchOuter());
        return { id: h, cancel: () => w.cancelIdleCallback?.(h) };
      }
      const h = window.setTimeout(fetchOuter, 200);
      return { id: h, cancel: () => window.clearTimeout(h) };
    })();

    async function fetchOuter() {
      try {
        const res = await fetch(
          `/api/events/month-counts?from=${addMonths(
            ring.anchorMonthKey,
            -WINDOW_HALF
          )}&to=${addMonths(ring.anchorMonthKey, WINDOW_HALF)}`,
          { signal: ac.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { counts: Record<string, number> };
        setCounts((prev) => ({ ...prev, ...data.counts }));
      } catch {
        // ignore
      }
    }

    return () => {
      ac.abort();
      idle.cancel();
    };
  }, [ring.anchorMonthKey]);

  // ------------- Scroll observer (sticky header + anchor advance) -------------
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        // 1. Sticky header: the topmost tile whose top edge is within the
        //    visible band drives `stickyMonth`.
        let topmost: { mk: MonthKey; top: number } | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const mk = el.dataset.monthkey;
          if (!mk) continue;
          const top = e.boundingClientRect.top;
          if (!topmost || top < topmost.top) topmost = { mk, top };
        }
        if (topmost) setStickyMonth(topmost.mk);

        // 2. Anchor advance: if the trailing-edge tile becomes >50% visible,
        //    push the anchor forward; mirror for leading edge.
        for (const e of entries) {
          if (e.intersectionRatio < 0.5) continue;
          const el = e.target as HTMLElement;
          const mk = el.dataset.monthkey;
          if (!mk) continue;
          const delta = monthDiff(mk, ring.anchorMonthKey);
          if (delta >= WINDOW_HALF) {
            dispatch({ type: "set-anchor", anchor: addMonths(mk, -WINDOW_HALF + 1) });
          } else if (delta <= -WINDOW_HALF) {
            dispatch({ type: "set-anchor", anchor: addMonths(mk, WINDOW_HALF - 1) });
          }
        }
      },
      { root, threshold: [0, 0.5, 1] }
    );

    for (const el of slotElsRef.current) {
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [ring.anchorMonthKey]);

  // Keep focus DOM in sync with `focusedDateKey` when it changes via keyboard.
  useEffect(() => {
    if (!focusedDateKey) return;
    const target = scrollerRef.current?.querySelector<HTMLElement>(
      `[data-cell-date="${focusedDateKey}"]`
    );
    if (target && document.activeElement !== target) {
      target.focus({ preventScroll: false });
    }
  }, [focusedDateKey]);

  // ------------- Handlers -------------
  const selectDate = useCallback(
    (dateKey: string) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (selectedDateKey === dateKey) next.delete("date");
      else next.set("date", dateKey);
      const qs = next.toString();
      router.replace(`/events${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams, selectedDateKey]
  );

  const stepFocus = useCallback(
    (deltaDays: number) => {
      setFocusedDateKey((cur) => {
        const d = parseDateKey(cur);
        d.setUTCDate(d.getUTCDate() + deltaDays);
        const next = isoDateOf(
          d.getUTCFullYear(),
          d.getUTCMonth() + 1,
          d.getUTCDate()
        );
        const nextMonth = next.slice(0, 7);
        if (!ring.slotMonthKey.includes(nextMonth)) {
          dispatch({ type: "set-anchor", anchor: nextMonth });
        }
        return next;
      });
    },
    [ring.slotMonthKey]
  );

  const onGridKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          stepFocus(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepFocus(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          stepFocus(7);
          break;
        case "ArrowUp":
          e.preventDefault();
          stepFocus(-7);
          break;
        case "PageDown":
          e.preventDefault();
          stepFocus(e.shiftKey ? 365 : 28);
          break;
        case "PageUp":
          e.preventDefault();
          stepFocus(e.shiftKey ? -365 : -28);
          break;
        case "Home":
          e.preventDefault();
          setFocusedDateKey((cur) => {
            const d = parseDateKey(cur);
            const iso = (d.getUTCDay() + 6) % 7;
            d.setUTCDate(d.getUTCDate() - iso);
            return isoDateOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
          });
          break;
        case "End":
          e.preventDefault();
          setFocusedDateKey((cur) => {
            const d = parseDateKey(cur);
            const iso = (d.getUTCDay() + 6) % 7;
            d.setUTCDate(d.getUTCDate() + (6 - iso));
            return isoDateOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
          });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          selectDate(focusedDateKey);
          break;
      }
    },
    [focusedDateKey, selectDate, stepFocus]
  );

  // Out-of-window selection → show the "Jump back to …" pill.
  const selectionInWindow = useMemo(() => {
    if (!selectedDateKey) return true;
    return ring.slotMonthKey.includes(selectedDateKey.slice(0, 7));
  }, [ring.slotMonthKey, selectedDateKey]);

  // Order slots chronologically for paint, but keep DOM identity stable.
  const slotsByDate = useMemo(() => {
    return ring.slotMonthKey.map((mk, slotIdx) => ({
      slotIdx,
      monthKey: mk,
      orderIndex: monthDiff(mk, ring.slotMonthKey[0]!),
    }));
  }, [ring.slotMonthKey]);

  return (
    <section
      aria-label="Event calendar"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 sm:p-4"
    >
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => dispatch({ type: "step-anchor", delta: -1 })}
            className="rounded-md px-2 py-1 text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ‹
          </button>
          <h2
            className="font-heading text-base font-bold text-on-surface min-w-[10ch] text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {MONTH_FMT.format(
              new Date(
                Date.UTC(
                  parseMonthKey(stickyMonth).year,
                  parseMonthKey(stickyMonth).month - 1,
                  1
                )
              )
            )}
          </h2>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => dispatch({ type: "step-anchor", delta: 1 })}
            className="rounded-md px-2 py-1 text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ›
          </button>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close calendar"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ×
          </button>
        )}
      </header>

      {!selectionInWindow && selectedDateKey && (
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "set-anchor", anchor: selectedDateKey.slice(0, 7) })
          }
          className="mb-2 flex w-full items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm text-on-surface hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span aria-hidden="true">↺</span>
          <span>
            Jump back to{" "}
            <strong>{formatPillLabel(selectedDateKey)}</strong> (selected)
          </span>
        </button>
      )}

      <div className="mb-1 grid grid-cols-7 gap-1 px-1 text-center text-[10px] uppercase tracking-wider text-secondary">
        {WEEKDAYS_MON_FIRST.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div
        ref={scrollerRef}
        role="grid"
        aria-label="Event calendar, use arrow keys to browse dates"
        onKeyDown={onGridKeyDown}
        className="event-calendar-scroll relative max-h-[60vh] overflow-y-auto"
      >
        {slotsByDate.map(({ slotIdx, monthKey, orderIndex }) => (
          <MonthTile
            key={slotIdx}
            ref={(el) => {
              slotElsRef.current[slotIdx] = el;
            }}
            monthKey={monthKey}
            order={orderIndex}
            rebindVersion={ring.rebindVersion[slotIdx] ?? 0}
            counts={counts}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            focusedDateKey={focusedDateKey}
            onCellFocus={setFocusedDateKey}
            onCellSelect={selectDate}
          />
        ))}
      </div>

      <style jsx>{`
        .event-calendar-scroll {
          display: flex;
          flex-direction: column;
          scroll-behavior: smooth;
        }
      `}</style>
    </section>
  );
}

// ---------------- MonthTile ----------------

type MonthTileProps = {
  monthKey: MonthKey;
  order: number;
  rebindVersion: number;
  counts: Record<string, number>;
  todayKey: string;
  selectedDateKey: string | null;
  focusedDateKey: string;
  onCellFocus: (key: string) => void;
  onCellSelect: (key: string) => void;
};

const MonthTile = forwardRef<HTMLElement, MonthTileProps>(function MonthTile(
  {
    monthKey,
    order,
    rebindVersion,
    counts,
    todayKey,
    selectedDateKey,
    focusedDateKey,
    onCellFocus,
    onCellSelect,
  },
  ref
) {
  const grid = useMemo(() => buildMonthGrid(monthKey), [monthKey]);
  const titleDate = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey);
    return new Date(Date.UTC(year, month - 1, 1));
  }, [monthKey]);

  // Crossfade trigger: rebindVersion is used as a key on the inner grid so a
  // version bump remounts it and re-runs the CSS `ec-fade-in` keyframe.
  // `prefers-reduced-motion` short-circuits this in CSS.

  return (
    <section
      ref={ref as Ref<HTMLElement>}
      data-monthkey={monthKey}
      aria-label={MONTH_FMT.format(titleDate)}
      style={{ order, contain: "layout paint" }}
      className="month-tile mb-3 last:mb-0"
    >
      <h3 className="px-1 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-secondary">
        {MONTH_FMT.format(titleDate)}
      </h3>
      <div
        key={rebindVersion}
        role="rowgroup"
        className="month-tile-grid grid grid-cols-7 gap-1 px-1"
      >
        {grid.map((cell, i) => {
          if (!cell.date) {
            return <span key={`pad-${i}`} aria-hidden="true" />;
          }
          const isToday = cell.date === todayKey;
          const isSelected = cell.date === selectedDateKey;
          const isFocused = cell.date === focusedDateKey;
          const count = counts[cell.date] ?? 0;
          const level = densityLevel(count);
          const tabIndex = isFocused ? 0 : -1;

          const ariaLabel = `${formatDateLabel(cell.date)}, ${
            count === 0 ? "no events" : `${count} event${count === 1 ? "" : "s"}`
          }`;

          return (
            <button
              key={cell.date}
              type="button"
              role="gridcell"
              aria-label={ariaLabel}
              aria-selected={isSelected || undefined}
              aria-current={isToday ? "date" : undefined}
              tabIndex={tabIndex}
              data-cell-date={cell.date}
              onClick={() => onCellSelect(cell.date!)}
              onFocus={() => onCellFocus(cell.date!)}
              className={[
                "relative aspect-square min-h-[28px] rounded-md text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "bg-primary text-on-primary"
                  : isToday
                  ? "ring-1 ring-primary text-on-surface bg-surface-container"
                  : "text-on-surface hover:bg-surface-container",
              ].join(" ")}
            >
              <span>{cell.day}</span>
              {level > 0 && !isSelected && (
                <span
                  aria-hidden="true"
                  className={[
                    "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 rounded-full",
                    level === 1 ? "w-1 bg-primary/40" : "",
                    level === 2 ? "w-1.5 bg-primary/70" : "",
                    level === 3 ? "w-2 bg-primary" : "",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .month-tile-grid {
          animation: ec-fade-in 120ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .month-tile-grid {
            animation: none;
          }
        }
        @keyframes ec-fade-in {
          from {
            opacity: 0.4;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
});
