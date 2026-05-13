/**
 * Time-window helpers for the chip row on list pages (EVE-208).
 *
 * Resolves named windows ("today", "tomorrow", "weekend", "next7", "month")
 * into a UTC `[start, end)` half-open Date range, honouring the target time
 * zone (Australia/Sydney by default, which observes DST).
 *
 * Computed with `Intl.DateTimeFormat` rather than a date library so DST and
 * week boundaries fall out of the host's tzdata.
 */

export type TimeWindowKey =
  | "today"
  | "tomorrow"
  | "weekend"
  | "next7"
  | "month";

export const TIME_WINDOW_KEYS: readonly TimeWindowKey[] = [
  "today",
  "tomorrow",
  "weekend",
  "next7",
  "month",
] as const;

export const TIME_WINDOW_LABELS: Record<TimeWindowKey, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  weekend: "This weekend",
  next7: "Next 7 days",
  month: "This month",
};

export const DEFAULT_TIME_ZONE = "Australia/Sydney";

export function isTimeWindowKey(value: unknown): value is TimeWindowKey {
  return (
    typeof value === "string" &&
    (TIME_WINDOW_KEYS as readonly string[]).includes(value)
  );
}

type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0=Sun..6=Sat
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function partsToMap(
  parts: Intl.DateTimeFormatPart[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

function zonedDateParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const map = partsToMap(dtf.formatToParts(date));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: WEEKDAY_MAP[map.weekday] ?? 0,
  };
}

function getZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map = partsToMap(dtf.formatToParts(date));
  // `hour` can be "24" on some engines for midnight — normalise to 0.
  const hour = Number(map.hour) % 24;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - date.getTime();
}

/**
 * Convert a wall-clock instant (year/month/day in `timeZone`) to a UTC Date.
 * Handles DST by computing the zone offset at the resulting instant.
 */
function zonedDayStart(
  year: number,
  month: number, // 1-12
  day: number,
  timeZone: string,
): Date {
  // Two-pass fixed-point: the offset at UTC midnight can differ from the
  // offset at the zone's local midnight when a DST transition lands inside
  // the same calendar day. Re-resolving against the candidate corrects it.
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset1 = getZoneOffsetMs(guess, timeZone);
  const candidate = new Date(guess.getTime() - offset1);
  const offset2 = getZoneOffsetMs(candidate, timeZone);
  if (offset1 === offset2) return candidate;
  return new Date(guess.getTime() - offset2);
}

/**
 * Returns the UTC instant for 00:00 on `today + offsetDays` in `timeZone`,
 * where `today` is the zoned calendar date of `now`. Calendar arithmetic
 * uses UTC date math, then we re-resolve the zone offset on the target day
 * so DST transitions don't shift the boundary.
 */
function dayAtOffset(
  base: ZonedParts,
  offsetDays: number,
  timeZone: string,
): Date {
  const tmp = new Date(
    Date.UTC(base.year, base.month - 1, base.day + offsetDays),
  );
  return zonedDayStart(
    tmp.getUTCFullYear(),
    tmp.getUTCMonth() + 1,
    tmp.getUTCDate(),
    timeZone,
  );
}

/** Half-open [start, end) range in UTC. */
export type TimeWindow = { start: Date; end: Date };

export function resolveTimeWindow(
  key: TimeWindowKey,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): TimeWindow {
  const today = zonedDateParts(now, timeZone);

  if (key === "today") {
    return { start: dayAtOffset(today, 0, timeZone), end: dayAtOffset(today, 1, timeZone) };
  }
  if (key === "tomorrow") {
    return { start: dayAtOffset(today, 1, timeZone), end: dayAtOffset(today, 2, timeZone) };
  }
  if (key === "next7") {
    return { start: dayAtOffset(today, 0, timeZone), end: dayAtOffset(today, 7, timeZone) };
  }
  if (key === "weekend") {
    // Fri (5), Sat (6), Sun (0) belong to the current weekend; the window
    // extends through Monday 00:00 in the target zone. Earlier in the week,
    // it points at the upcoming Fri-Mon.
    let startOffset: number;
    let endOffset: number;
    switch (today.weekday) {
      case 0: // Sun
        startOffset = 0;
        endOffset = 1;
        break;
      case 1: // Mon
        startOffset = 4;
        endOffset = 7;
        break;
      case 2: // Tue
        startOffset = 3;
        endOffset = 6;
        break;
      case 3: // Wed
        startOffset = 2;
        endOffset = 5;
        break;
      case 4: // Thu
        startOffset = 1;
        endOffset = 4;
        break;
      case 5: // Fri
        startOffset = 0;
        endOffset = 3;
        break;
      case 6: // Sat
        startOffset = 0;
        endOffset = 2;
        break;
      default:
        startOffset = 0;
        endOffset = 1;
    }
    return {
      start: dayAtOffset(today, startOffset, timeZone),
      end: dayAtOffset(today, endOffset, timeZone),
    };
  }
  // "month" — today through start of next calendar month in the target zone.
  const nextMonthYear = today.month === 12 ? today.year + 1 : today.year;
  const nextMonth = today.month === 12 ? 1 : today.month + 1;
  return {
    start: dayAtOffset(today, 0, timeZone),
    end: zonedDayStart(nextMonthYear, nextMonth, 1, timeZone),
  };
}
