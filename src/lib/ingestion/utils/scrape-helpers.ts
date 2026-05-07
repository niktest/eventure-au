const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export function resolveUrl(href: string | undefined, baseUrl: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function ensureHttps(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, "https://");
}

// Pull a `background-image: url(...)` value out of a style attribute.
export function extractBackgroundImage(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const match = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return match ? match[2] : undefined;
}

interface ParseHumanDateOptions {
  // The "now" reference for year inference. Defaults to current date.
  // Inject in tests for determinism.
  now?: Date;
  // If the parsed month/day has already passed this year, roll forward to next year.
  preferFuture?: boolean;
}

// Parse human-format dates that some venues expose without a year.
// Examples handled:
//   "Sat 9 May", "Saturday 23 May", "8 May 2026", "Fri 8 May - Fri 11 Dec"
// For ranges, returns the start.
// Returns `null` if the input can't be confidently parsed; callers should
// then fall back to skipping the event rather than emitting bad data.
export function parseHumanDate(text: string, options: ParseHumanDateOptions = {}): Date | null {
  if (!text) return null;
  const { now = new Date(), preferFuture = true } = options;

  // Strip the day-of-week prefix if present, take the start of any range.
  const cleaned = text
    .replace(/&nbsp;/gi, " ")
    .replace(/[–—]/g, "-")
    .split(/\s*-\s*/)[0]
    .trim()
    .replace(/^(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,.\s]+/i, "");

  // Match `DD Mon` or `DD Mon YYYY` (case-insensitive, day 1-31).
  const m = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const monthIdx = MONTHS[m[2].toLowerCase()];
  if (monthIdx === undefined || day < 1 || day > 31) return null;

  let year = m[3] ? parseInt(m[3], 10) : now.getUTCFullYear();
  if (!m[3] && preferFuture) {
    const candidate = new Date(Date.UTC(year, monthIdx, day));
    // 24h grace so events happening today aren't pushed to next year.
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      year += 1;
    }
  }

  return new Date(Date.UTC(year, monthIdx, day));
}
