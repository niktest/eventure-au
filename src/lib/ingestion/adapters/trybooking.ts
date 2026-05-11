import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { AU_LOCATIONS } from "../au-locations";

// TryBooking exposes an undocumented JSON search endpoint at
//   /events/api/v1/search?keyword=&location=&date=&page=N
// The public-facing search is hard-capped at 15 results per query — the
// response includes `hasMore: true` but page=2 has always returned an empty
// `results: null` payload across every keyword/location combination we have
// probed. We still walk pages honestly and stop on the first empty page, but
// in practice each per-city query returns a single page.
const MAX_PAGES_PER_LOCATION = 20;
const PAGE_DELAY_MS = 200;

interface TryBookingResult {
  id: number;
  name: string;
  eventDisplayName?: string;
  description?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  venueName?: string;
  heroImage?: string;
  thumbnailImage?: string;
  timeZoneId?: string;
  isCancelled?: boolean;
}

interface TryBookingResponse {
  results: TryBookingResult[] | null;
  skip?: number;
  take?: number;
  hasMore?: boolean;
}

/**
 * TryBooking scraper adapter.
 *
 * Hits the site's undocumented JSON search endpoint per AU city. Walks pages
 * until the API returns an empty page or until the safety cap. The endpoint
 * caps at 15 results per query today, so we widen coverage by fanning out
 * across `location=<city>` and rely on (source, sourceId) dedup downstream.
 */
export class TryBookingAdapter implements SourceAdapter {
  readonly name = "trybooking";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.TRYBOOKING_URL ?? "https://www.trybooking.com";
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of AU_LOCATIONS) {
      let page = 1;
      let cityAdded = 0;

      while (page <= MAX_PAGES_PER_LOCATION) {
        const url = `${baseUrl}/events/api/v1/search?keyword=&location=${encodeURIComponent(loc.name)}&date=&page=${page}&recaptchaToken=`;
        let data: TryBookingResponse;
        try {
          const res = await fetch(url, {
            headers: {
              "User-Agent": SCRAPER_USER_AGENT,
              Accept: "application/json",
            },
          });
          if (!res.ok) {
            console.error(
              `[trybooking] ${loc.name} page ${page}: HTTP ${res.status}`
            );
            break;
          }
          data = (await res.json()) as TryBookingResponse;
        } catch (err) {
          console.error(`[trybooking] ${loc.name} page ${page} fetch failed:`, err);
          break;
        }

        const results = data.results ?? [];
        if (results.length === 0) break;

        let newOnPage = 0;
        for (const item of results) {
          const ev = mapEvent(item, baseUrl, loc.name, loc.state);
          if (!ev) continue;
          if (seen.has(ev.sourceId)) continue;
          seen.add(ev.sourceId);
          allEvents.push(ev);
          cityAdded++;
          newOnPage++;
        }

        if (!data.hasMore) break;
        // Defensive: if a page returned only duplicates we've seen, the
        // endpoint is cycling and we should stop.
        if (newOnPage === 0) break;

        page++;
        if (PAGE_DELAY_MS > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
      }

      console.log(
        `[trybooking]   -> ${loc.name} (${loc.state}): +${cityAdded} (total=${allEvents.length})`
      );
    }

    return allEvents;
  }
}

function mapEvent(
  item: TryBookingResult,
  baseUrl: string,
  fallbackCity: string,
  fallbackState: string
): RawEvent | null {
  if (!item.id || !item.name) return null;
  if (item.isCancelled) return null;

  const start = item.eventStartDate ? new Date(item.eventStartDate) : null;
  if (!start || Number.isNaN(start.getTime())) return null;

  const end = item.eventEndDate ? new Date(item.eventEndDate) : undefined;
  const eventUrl = `${baseUrl}/events/${item.id}`;

  return {
    sourceId: `trybooking-${item.id}`,
    name: item.eventDisplayName ?? item.name,
    description: item.description ?? undefined,
    startDate: start,
    endDate: end && !Number.isNaN(end.getTime()) ? end : undefined,
    imageUrl: item.heroImage || item.thumbnailImage || undefined,
    url: eventUrl,
    venueName: item.venueName ?? undefined,
    city: fallbackCity,
    state: fallbackState,
    ticketUrl: eventUrl,
    ticketProvider: "trybooking",
    rawData: item,
  };
}
