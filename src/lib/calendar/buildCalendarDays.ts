import { prisma } from "@/lib/prisma";

export type CalendarDay = {
  /** ISO YYYY-MM-DD in server timezone. */
  date: string;
  /** "Mon" */
  weekdayShort: string;
  /** Day-of-month numeric (1-31). */
  dayNumber: number;
  /** "May" */
  monthShort: string;
  hasEvents: boolean;
  eventCount?: number;
  isToday: boolean;
  isPast: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-AU", { weekday: "short" });
const MONTH_FMT = new Intl.DateTimeFormat("en-AU", { month: "short" });

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build the 14-day calendar strip starting from `today` (server-side now).
 * Optionally enrich with per-day event counts. If the DB is unavailable the
 * counts default to 0 (the strip still renders so the page does not break).
 */
export async function buildCalendarDays(opts?: {
  now?: Date;
  withCounts?: boolean;
}): Promise<CalendarDay[]> {
  const now = opts?.now ?? new Date();
  const today = startOfDay(now);

  const days: CalendarDay[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getTime() + i * DAY_MS);
    return {
      date: isoDate(d),
      weekdayShort: WEEKDAY_FMT.format(d),
      dayNumber: d.getDate(),
      monthShort: MONTH_FMT.format(d),
      hasEvents: false,
      isToday: i === 0,
      isPast: false,
    };
  });

  if (!opts?.withCounts) return days;

  const rangeStart = today;
  const rangeEnd = new Date(today.getTime() + 14 * DAY_MS);

  let events: Array<{ startDate: Date }> = [];
  try {
    events = await prisma.event.findMany({
      where: {
        status: "published",
        startDate: { gte: rangeStart, lt: rangeEnd },
      },
      select: { startDate: true },
    });
  } catch {
    // DB unavailable — return the bare strip without counts.
    return days;
  }

  const counts = new Map<string, number>();
  for (const e of events) {
    const key = isoDate(startOfDay(e.startDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return days.map((d) => {
    const c = counts.get(d.date) ?? 0;
    return c > 0 ? { ...d, hasEvents: true, eventCount: c } : d;
  });
}
