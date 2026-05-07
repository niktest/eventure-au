/**
 * Pure helpers for the `?date=YYYY-MM-DD` filter shared by the homepage
 * calendar strip and the /events listing page. Same-day window in UTC for v1
 * (matches /events page behaviour); venue-local-tz handling is a follow-up.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = {
  dayStart: Date;
  dayEnd: Date;
};

export function parseDateParam(value: string | undefined | null): DateRange | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const dayStart = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) return null;
  return { dayStart, dayEnd: new Date(dayStart.getTime() + DAY_MS) };
}

/**
 * Format an ISO YYYY-MM-DD date as a friendly label, e.g. "Fri 8 May".
 * Used by the homepage heading when a calendar date is selected.
 */
export function formatDateLabel(value: string): string {
  if (!ISO_DATE.test(value)) return value;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}
