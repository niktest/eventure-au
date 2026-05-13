import type { RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { extractJsonLdEvents } from "../utils/extract-json-ld";
import {
  ensureHttps,
  stripHtmlDescription,
  upgradeAtdwImage,
} from "../utils/scrape-helpers";

const SOURCE = "visitbrisbane";

// Visit Brisbane's /whats-on listing is a client-rendered shell — events
// arrive via a Sitecore XHR (`cd-visit.beda.systems/api/Event/EventSearch`)
// that returns `null` without an internal API key. The sitemap, however,
// links to every event detail page (~800 entries) and each detail page
// ships clean schema.org `Event` JSON-LD. We walk a recency-sorted slice of
// the sitemap, fetch detail pages concurrently, and let `extractJsonLdEvents`
// do the parsing — matching the "JSON-LD before cheerio" rule in
// `CONTRIBUTING.md`.
const DEFAULT_MAX_EVENTS = 200;
const DEFAULT_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 12_000;
// ATDW-backed listings sometimes carry placeholder dates like
// `startDate: 2023-12-17, endDate: 0001-01-01` for stale rows the source
// hasn't deleted. We drop any event whose effective end is more than
// `STALE_GRACE_MS` in the past so they don't pollute the calendar.
const STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

interface SitemapEntry {
  url: string;
  lastmod: number; // epoch ms; -Infinity if missing
}

export class VisitBrisbaneAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl =
      process.env.VISIT_BRISBANE_URL ?? "https://visit.brisbane.qld.au";
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    console.log(`[visitbrisbane] Scraping sitemap ${sitemapUrl}`);

    const sitemap = await fetchText(sitemapUrl);
    if (!sitemap) return [];

    const entries = extractEventEntries(sitemap, baseUrl);
    const max = readEnvInt("VISIT_BRISBANE_MAX_EVENTS", DEFAULT_MAX_EVENTS);
    const concurrency = readEnvInt(
      "VISIT_BRISBANE_CONCURRENCY",
      DEFAULT_CONCURRENCY
    );
    const slice = entries.slice(0, max);
    console.log(
      `[visitbrisbane] ${entries.length} event URLs in sitemap; fetching ${slice.length} (concurrency ${concurrency})`
    );

    const now = new Date();
    const events: RawEvent[] = [];
    await runWithConcurrency(slice, concurrency, async (entry) => {
      const html = await fetchText(entry.url);
      if (!html) return;
      const detail = parseEventDetail(html, entry.url, now);
      if (detail) events.push(detail);
    });

    if (events.length === 0) {
      console.log(
        "[visitbrisbane] Sitemap walk yielded no events with valid JSON-LD (selectors may have drifted)"
      );
    }
    return events;
  }
}

// Exported for unit tests.
export function extractEventEntries(
  sitemap: string,
  baseUrl: string
): SitemapEntry[] {
  // Only event detail pages have the shape `/whats-on/<locality>/<category>/<slug>`.
  // Category index pages live at `/whats-on` and `/whats-on/<locality>` and
  // are skipped by requiring the slug segment.
  const eventUrl = new RegExp(
    `^${escapeRegex(baseUrl)}/whats-on/[^/]+/[^/]+/[^/]+/?$`,
    "i"
  );
  const urlBlock = /<url>([\s\S]*?)<\/url>/gi;
  const seen = new Map<string, SitemapEntry>();

  for (const m of sitemap.matchAll(urlBlock)) {
    const body = m[1];
    const loc = body.match(/<loc>([^<]+)<\/loc>/i)?.[1];
    if (!loc) continue;
    const trimmed = loc.trim();
    if (!eventUrl.test(trimmed)) continue;
    const lastmodRaw = body.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim();
    const lastmod = lastmodRaw
      ? Date.parse(lastmodRaw)
      : Number.NEGATIVE_INFINITY;
    const prev = seen.get(trimmed);
    if (!prev || prev.lastmod < lastmod) {
      seen.set(trimmed, { url: trimmed, lastmod });
    }
  }

  // Most-recently-updated first so a capped per-run slice picks live rows.
  return Array.from(seen.values()).sort((a, b) => b.lastmod - a.lastmod);
}

function parseEventDetail(
  html: string,
  fallbackUrl: string,
  now: Date
): RawEvent | null {
  const events = extractJsonLdEvents(html, {
    sourceIdPrefix: SOURCE,
    city: "Brisbane",
    state: "QLD",
  });
  const ev = events[0];
  if (!ev) return null;

  const endDate = plausibleDate(ev.endDate);
  const startDate = plausibleDate(ev.startDate);
  if (!startDate) return null;

  // Drop fully-past events: end (or start if end missing) must be ≥ now - grace.
  const effectiveEnd = endDate ?? startDate;
  if (effectiveEnd.getTime() < now.getTime() - STALE_GRACE_MS) return null;

  const description = stripHtmlDescription(ev.description);
  const imageUrl = ensureHttps(upgradeAtdwImage(ev.imageUrl));
  const url = ev.url ?? fallbackUrl;

  return {
    ...ev,
    sourceId: url,
    name: ev.name,
    description,
    startDate,
    endDate,
    imageUrl,
    url,
    city: pickString(ev.city, "Brisbane"),
    state: pickString(ev.state, "QLD"),
  };
}

function plausibleDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  // ATDW emits `0001-01-01` as a placeholder "no date set" sentinel.
  if (!Number.isFinite(d.getTime()) || d.getUTCFullYear() < 1990) {
    return undefined;
  }
  return d;
}

function pickString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length ? trimmed : fallback;
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": SCRAPER_USER_AGENT, Accept: "text/html,application/xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[visitbrisbane] HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`[visitbrisbane] Fetch failed for ${url}:`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        await worker(items[idx]);
      }
    }
  );
  await Promise.all(runners);
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
