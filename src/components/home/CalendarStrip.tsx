"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CalendarDay } from "@/lib/calendar/buildCalendarDays";

type CalendarStripProps = {
  days: CalendarDay[];
};

/**
 * Horizontally scrollable 14-day strip per EVE-126 §4.1.
 * Click a day to filter the event grid below via `?date=YYYY-MM-DD`.
 */
export function CalendarStrip({ days }: CalendarStripProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const initialSelected = params?.get("date") ?? null;
  const [selected, setSelected] = useState<string | null>(initialSelected);

  useEffect(() => {
    setSelected(params?.get("date") ?? null);
  }, [params]);

  // Auto-scroll to today (or the deep-linked date) on mount.
  useEffect(() => {
    const target = selected ?? days.find((d) => d.isToday)?.date ?? null;
    if (!target || !scrollerRef.current) return;
    const el = scrollerRef.current.querySelector<HTMLElement>(
      `[data-date="${target}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest", inline: "start" });
  }, [days, selected]);

  const onSelect = useCallback(
    (date: string) => {
      const next = new URLSearchParams(params?.toString() ?? "");
      if (selected === date) {
        next.delete("date");
        setSelected(null);
      } else {
        next.set("date", date);
        setSelected(date);
      }
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, pathname, router, selected]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const focusable = Array.from(
        scrollerRef.current?.querySelectorAll<HTMLButtonElement>(
          'button[role="tab"]'
        ) ?? []
      );
      const idx = focusable.findIndex((b) => b === document.activeElement);
      if (idx < 0) return;
      let next = idx;
      if (e.key === "ArrowRight") next = Math.min(idx + 1, focusable.length - 1);
      else if (e.key === "ArrowLeft") next = Math.max(idx - 1, 0);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = focusable.length - 1;
      else return;
      e.preventDefault();
      focusable[next]?.focus();
    },
    []
  );

  return (
    <div
      ref={scrollerRef}
      role="tablist"
      aria-label="Filter events by date"
      onKeyDown={onKeyDown}
      className="flex items-stretch gap-2 overflow-x-auto hide-scrollbar pb-1 md:gap-2.5 lg:gap-3 snap-x snap-mandatory"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, #000 0, #000 calc(100% - 12px), transparent 100%)",
        maskImage:
          "linear-gradient(90deg, #000 0, #000 calc(100% - 12px), transparent 100%)",
      }}
    >
      {days.map((d) => {
        const isSelected = selected === d.date;
        return (
          <CalendarCell
            key={d.date}
            day={d}
            isSelected={isSelected}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

function CalendarCell({
  day,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  isSelected: boolean;
  onSelect: (date: string) => void;
}) {
  const { date, weekdayShort, dayNumber, monthShort, hasEvents, isToday } = day;

  const base =
    "snap-start shrink-0 flex flex-col items-center justify-between rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow text-center";
  const dims = "w-16 h-[84px] py-2 px-1 md:w-[76px] md:h-[92px] lg:w-[88px] lg:h-[104px] md:py-2.5";

  let surface: string;
  let label: string;
  if (isToday) {
    surface = "border-transparent text-[#0B0D12] shadow-[0_0_0_2px_rgba(255,136,102,0.4)]";
    label = `Today, ${weekdayShort} ${dayNumber} ${monthShort}`;
  } else if (isSelected) {
    surface = "bg-surface-2 border-2 border-neon-coral text-on-dark-strong";
    label = `${weekdayShort} ${dayNumber} ${monthShort} (selected)`;
  } else if (hasEvents) {
    surface = "bg-surface-1 border-surface-3 text-on-dark-strong hover:bg-surface-2";
    label = `${weekdayShort} ${dayNumber} ${monthShort} — events available`;
  } else {
    surface = "bg-surface-1 border-surface-3 text-on-dark-muted hover:bg-surface-2";
    label = `${weekdayShort} ${dayNumber} ${monthShort} — no events`;
  }

  const todayStyle = isToday
    ? { background: "var(--gradient-calendar-today)" }
    : undefined;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-label={label}
      data-date={date}
      onClick={() => onSelect(date)}
      className={`${base} ${dims} ${surface}`}
      style={todayStyle}
    >
      <span className="font-body text-[10px] uppercase tracking-wider font-semibold leading-none">
        {weekdayShort}
      </span>
      <span className="font-heading text-2xl font-bold leading-none">
        {dayNumber}
      </span>
      <span className="font-body text-[10px] uppercase tracking-wider font-semibold leading-none">
        {monthShort}
      </span>
      <span
        aria-hidden="true"
        className={`block h-1 w-1 rounded-full ${
          hasEvents && !isToday ? "bg-neon-coral" : "bg-transparent"
        }`}
      />
    </button>
  );
}
