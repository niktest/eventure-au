import type { RawEvent } from "@/types/event";

/**
 * Severities for QC findings.
 *
 * - `error`   — disqualifies the event; tests should fail when an `error` is
 *               present on a sample taken from an adapter.
 * - `warning` — degraded quality but not a hard block; surfaced in reports.
 */
export type QualitySeverity = "error" | "warning";

export interface QualityIssue {
  field: string;
  code: string;
  severity: QualitySeverity;
  message: string;
}

export interface QualityAssessment {
  ok: boolean;
  issues: QualityIssue[];
  errors: QualityIssue[];
  warnings: QualityIssue[];
}

const GENERIC_NAMES = new Set([
  "event",
  "events",
  "tba",
  "tbc",
  "tbd",
  "untitled",
  "coming soon",
  "title",
]);

/** Heuristic markers that the URL is a listing-thumbnail, not a full-res image. */
const THUMBNAIL_MARKERS: RegExp[] = [
  /[?&]t=\d{2,3}x\d{2,3}\b/i, // ?t=300x300
  /[-_/](?:thumb|thumbnail|small|tiny)\b/i,
  /-\d{2,3}x\d{2,3}\.(?:jpe?g|png|webp|gif)$/i, // wp -150x150.jpg
  /\/(?:80|96|120|150|160|200|240|320|400|480)w-/i, // /480w-3-2/
  /\bw=(?:80|96|120|150|160|200|240|320|400|480)\b/i,
  /\bwidth=(?:80|96|120|150|160|200|240|320|400|480)\b/i,
];

/** Tags that should never appear in a description we ship to the UI. */
const HTML_TAG_RE = /<\/?(?:p|br|div|span|strong|em|ul|ol|li|a|img|h[1-6])\b/i;

/** Tolerance: a startDate within this many ms of "now" smells fabricated. */
const SUSPICIOUS_NOW_WINDOW_MS = 60_000;

/** Reject startDates more than this many years in the future. */
const MAX_FUTURE_YEARS = 5;

interface AssessOptions {
  /** Reference "now" for date sanity checks. Defaults to `new Date()`. */
  now?: Date;
  /** When true, undated/very-soon events fail as errors instead of warnings. */
  strictDate?: boolean;
}

export function assessEventQuality(
  event: RawEvent,
  options: AssessOptions = {}
): QualityAssessment {
  const now = options.now ?? new Date();
  const issues: QualityIssue[] = [];

  // --- name ---
  const name = (event.name ?? "").trim();
  if (!name) {
    issues.push({
      field: "name",
      code: "missing_name",
      severity: "error",
      message: "Event has no name.",
    });
  } else {
    if (GENERIC_NAMES.has(name.toLowerCase())) {
      issues.push({
        field: "name",
        code: "generic_name",
        severity: "error",
        message: `Name "${name}" is a generic placeholder.`,
      });
    } else if (name.length < 4) {
      issues.push({
        field: "name",
        code: "short_name",
        severity: "warning",
        message: `Name "${name}" is suspiciously short.`,
      });
    }
  }

  // --- startDate ---
  const startDate = coerceDate(event.startDate);
  if (!startDate) {
    issues.push({
      field: "startDate",
      code: "missing_start_date",
      severity: "error",
      message: "Event has no valid startDate.",
    });
  } else {
    const delta = startDate.getTime() - now.getTime();
    const endDate = coerceDate(event.endDate);
    // startDate≈now is only a smell when there's no endDate either; events
    // shaped "From now until <future>" are legitimate ongoing entries that
    // intentionally anchor start to today.
    if (Math.abs(delta) < SUSPICIOUS_NOW_WINDOW_MS && !endDate) {
      issues.push({
        field: "startDate",
        code: "fabricated_start_date",
        severity: "error",
        message:
          "startDate is within 60s of 'now' with no endDate — likely fabricated for an undated card.",
      });
    } else if (delta < -1000 * 60 * 60 * 24 * 90) {
      // > 90 days in the past
      issues.push({
        field: "startDate",
        code: "stale_start_date",
        severity: "warning",
        message: `startDate ${startDate.toISOString()} is far in the past.`,
      });
    } else if (delta > 1000 * 60 * 60 * 24 * 365 * MAX_FUTURE_YEARS) {
      issues.push({
        field: "startDate",
        code: "implausible_future_date",
        severity: "warning",
        message: `startDate ${startDate.toISOString()} is more than ${MAX_FUTURE_YEARS}y away.`,
      });
    }
  }

  // --- url / sourceId ---
  const url = (event.url ?? "").trim();
  if (!url && !event.sourceId) {
    issues.push({
      field: "url",
      code: "missing_url",
      severity: "error",
      message: "Event has no url or sourceId.",
    });
  } else if (url && !/^https?:\/\//i.test(url)) {
    issues.push({
      field: "url",
      code: "invalid_url",
      severity: "error",
      message: `url "${url}" is not absolute http(s).`,
    });
  }

  // --- imageUrl (offline heuristics only; live byte-size check lives in the
  // QC sampling script) ---
  if (event.imageUrl) {
    const img = event.imageUrl;
    if (!/^https?:\/\//i.test(img)) {
      issues.push({
        field: "imageUrl",
        code: "invalid_image_url",
        severity: "error",
        message: `imageUrl "${img}" is not absolute http(s).`,
      });
    } else if (looksLikeThumbnail(img)) {
      issues.push({
        field: "imageUrl",
        code: "thumbnail_image",
        severity: "error",
        message: `imageUrl "${img}" matches a listing-thumbnail pattern — probe and use the full-res variant via scrape-helpers.`,
      });
    }
  }

  // --- description ---
  if (event.description) {
    if (HTML_TAG_RE.test(event.description)) {
      issues.push({
        field: "description",
        code: "html_in_description",
        severity: "error",
        message: "description contains raw HTML tags; strip them before upsert.",
      });
    }
  }

  // --- venue/location ---
  if (!event.venueName && !event.venueAddress && !event.city) {
    issues.push({
      field: "venue",
      code: "missing_location",
      severity: "warning",
      message: "Event has no venueName, venueAddress, or city.",
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { ok: errors.length === 0, issues, errors, warnings };
}

export function looksLikeThumbnail(url: string): boolean {
  return THUMBNAIL_MARKERS.some((re) => re.test(url));
}

function coerceDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Asserts that a *sample* of N events from an adapter all clear the quality
 * bar. Throws with a per-event diagnostic on the first failure.
 *
 * The "QC must check 2–3 events from each provider" rule lives here — adapter
 * test files call this with their fixture-parsed events, so `npm test` fails
 * loudly whenever a change degrades a provider's output.
 */
export function assertSampleQuality(
  events: RawEvent[],
  options: { source: string; sampleSize?: number; now?: Date } = {
    source: "unknown",
  }
): QualityAssessment[] {
  const sampleSize = options.sampleSize ?? 3;
  if (events.length === 0) {
    throw new Error(`[QC:${options.source}] adapter returned zero events`);
  }
  const sample = events.slice(0, sampleSize);
  const assessments = sample.map((e) =>
    assessEventQuality(e, { now: options.now })
  );

  const failures = assessments
    .map((a, i) => ({ a, e: sample[i], i }))
    .filter((x) => !x.a.ok);

  if (failures.length > 0) {
    const lines = failures.map(({ a, e, i }) => {
      const errs = a.errors
        .map((er) => `    - ${er.field}/${er.code}: ${er.message}`)
        .join("\n");
      return `  event[${i}] "${e.name ?? "<unnamed>"}" (${e.url ?? e.sourceId ?? "<no-url>"}):\n${errs}`;
    });
    throw new Error(
      `[QC:${options.source}] ${failures.length}/${sample.length} sampled events failed quality checks:\n${lines.join("\n")}`
    );
  }

  return assessments;
}
