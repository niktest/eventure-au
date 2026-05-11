import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { upgradeMoshtixImage } from "../utils/scrape-helpers";

const MAX_PAGES = 200;
const PAGE_DELAY_MS = 250;

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

function parseMoshtixEvents(html: string, baseUrl: string): RawEvent[] {
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
        const eventUrl = item.url?.startsWith("http") ? item.url : `${baseUrl}${item.url}`;
        events.push({
          sourceId: item.url ?? `moshtix-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: upgradeMoshtixImage(
            typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined
          ),
          url: eventUrl,
          venueName: item.location?.name ?? undefined,
          venueAddress: item.location?.address?.streetAddress ?? undefined,
          city: item.location?.address?.addressLocality ?? undefined,
          state: item.location?.address?.addressRegion ?? undefined,
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
