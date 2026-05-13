import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { decodeHtmlEntities, upgradeMoshtixImage } from "../utils/scrape-helpers";

const MAX_PAGES = 200;
const PAGE_DELAY_MS = 250;
const STALE_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Moshtix scraper adapter.
 * Paginates through the full moshtix.com.au search results.
 *
 * Note: the `location=<slug>` URL parameter accepted by the site does NOT
 * actually filter — every slug returns the same global list. We therefore
 * walk the unfiltered search and rely on the JSON-LD `addressRegion` /
 * `addressLocality` fields for per-event city/state.
 */
export class MoshtixAdapter implements SourceAdapter {
  readonly name = "moshtix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MOSHTIX_URL ?? "https://www.moshtix.com.au";
    const seen = new Set<string>();
    const allEvents: RawEvent[] = [];

    let page = 1;
    let totalPages: number | null = null;

    while (page <= MAX_PAGES) {
      const url = `${baseUrl}/v2/search?Page=${page}`;

      let html: string;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": SCRAPER_USER_AGENT },
        });
        if (!res.ok) {
          console.error(`[moshtix] HTTP ${res.status} on page ${page}`);
          break;
        }
        html = await res.text();
      } catch (err) {
        console.error(`[moshtix] Fetch failed on page ${page}:`, err);
        break;
      }

      if (totalPages === null) {
        totalPages = parsePageCount(html);
        console.log(
          `[moshtix] Search reports ${totalPages ?? "unknown"} page(s) of results`
        );
      }

      const pageEvents = parseMoshtixEvents(html, baseUrl);
      let newOnThisPage = 0;
      for (const ev of pageEvents) {
        if (seen.has(ev.sourceId)) continue;
        seen.add(ev.sourceId);
        allEvents.push(ev);
        newOnThisPage++;
      }
      console.log(
        `[moshtix] Page ${page}${totalPages ? `/${totalPages}` : ""}: parsed ${pageEvents.length}, ${newOnThisPage} new (total=${allEvents.length})`
      );

      if (pageEvents.length === 0) break;
      if (totalPages !== null && page >= totalPages) break;

      page++;
      if (PAGE_DELAY_MS > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }

    return allEvents;
  }
}

function parsePageCount(html: string): number | null {
  const match = html.match(/Page\s+\d+\s+of\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// Moshtix uses several Schema.org Event subtypes in its JSON-LD: Event,
// MusicEvent, ComedyEvent, TheaterEvent, SportsEvent. Accept all of them.
const EVENT_TYPES = new Set([
  "Event",
  "MusicEvent",
  "ComedyEvent",
  "TheaterEvent",
  "TheatreEvent",
  "SportsEvent",
  "DanceEvent",
  "FoodEvent",
  "Festival",
  "ScreeningEvent",
  "SocialEvent",
  "BusinessEvent",
  "EducationEvent",
  "ChildrensEvent",
]);

const TYPE_TO_CATEGORY: Record<string, RawEvent["category"]> = {
  MusicEvent: "MUSIC",
  ComedyEvent: "COMEDY",
  TheaterEvent: "THEATRE",
  TheatreEvent: "THEATRE",
  SportsEvent: "SPORTS",
  DanceEvent: "ARTS",
  FoodEvent: "FOOD_DRINK",
  Festival: "FESTIVAL",
  ScreeningEvent: "ARTS",
  SocialEvent: "COMMUNITY",
  ChildrensEvent: "FAMILY",
};

// Many Moshtix listings are "umbrella" recurring entries: a single sourceId
// whose `startDate` is when the series first ran (sometimes years ago) but
// whose `endDate` is set far in the future. Each upcoming session also
// appears in the search feed as its own event. Treat the umbrella as
// currently running — clamp its startDate to `now` so the validator stops
// flagging it as stale — and drop anything whose endDate has truly passed
// (or is missing while the start is in the past).
function resolveDates(
  rawStart: unknown,
  rawEnd: unknown,
  now: Date
): { startDate: Date; endDate: Date | undefined } | null {
  const start = toDate(rawStart);
  if (!start) return null;
  const end = toDate(rawEnd);
  const stale = start.getTime() < now.getTime() - STALE_GRACE_MS;
  if (!stale) return { startDate: start, endDate: end };
  if (end && end.getTime() > now.getTime()) {
    return { startDate: new Date(now.getTime()), endDate: end };
  }
  return null;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function decodeMaybe(value: unknown): string | undefined {
  return typeof value === "string" ? decodeHtmlEntities(value) : undefined;
}

function parseMoshtixEvents(
  html: string,
  baseUrl: string,
  now: Date = new Date()
): RawEvent[] {
  const events: RawEvent[] = [];
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = item["@type"];
        if (typeof type !== "string" || !EVENT_TYPES.has(type)) continue;
        const dates = resolveDates(item.startDate, item.endDate, now);
        if (!dates) continue;
        const eventUrl = item.url?.startsWith("http") ? item.url : `${baseUrl}${item.url}`;
        const name = decodeMaybe(item.name) ?? "Unknown Event";
        events.push({
          sourceId: item.url ?? `moshtix-${name.replace(/\s+/g, "-").toLowerCase()}`,
          name,
          description: decodeMaybe(item.description),
          startDate: dates.startDate,
          endDate: dates.endDate,
          imageUrl: upgradeMoshtixImage(
            typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined
          ),
          url: eventUrl,
          venueName: decodeMaybe(item.location?.name),
          venueAddress: decodeMaybe(item.location?.address?.streetAddress),
          city: decodeMaybe(item.location?.address?.addressLocality),
          state: decodeMaybe(item.location?.address?.addressRegion),
          category: TYPE_TO_CATEGORY[type] ?? "MUSIC",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  return events;
}
