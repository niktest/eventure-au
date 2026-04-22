import type { SourceAdapter, RawEvent } from "@/types/event";
import { AU_LOCATIONS } from "../au-locations";

/**
 * TryBooking scraper adapter.
 * Scrapes trybooking.com for Australian community event listings.
 * Searches all major AU cities.
 */
export class TryBookingAdapter implements SourceAdapter {
  readonly name = "trybooking";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.TRYBOOKING_URL ?? "https://www.trybooking.com";
    const allEvents: RawEvent[] = [];

    for (const loc of AU_LOCATIONS) {
      const searchUrl = `${baseUrl}/search?search=${encodeURIComponent(loc.name)}`;
      console.log(`[trybooking] Scraping ${loc.name} (${loc.state})`);

      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
          },
        });

        if (!res.ok) {
          console.error(`[trybooking] HTTP ${res.status} for ${loc.name}`);
          continue;
        }

        const html = await res.text();
        const events = parseTryBookingEvents(html, baseUrl, loc.name, loc.state);
        allEvents.push(...events);
      } catch (err) {
        console.error(`[trybooking] Fetch failed for ${loc.name}:`, err);
      }
    }

    return allEvents;
  }
}

function parseTryBookingEvents(html: string, baseUrl: string, fallbackCity: string, fallbackState: string): RawEvent[] {
  const events: RawEvent[] = [];
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item["@type"] !== "Event") continue;
        const eventUrl = item.url?.startsWith("http") ? item.url : `${baseUrl}${item.url}`;
        events.push({
          sourceId: item.url ?? `trybooking-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: eventUrl,
          venueName: item.location?.name ?? undefined,
          venueAddress: item.location?.address?.streetAddress ?? undefined,
          city: item.location?.address?.addressLocality ?? fallbackCity,
          state: item.location?.address?.addressRegion ?? fallbackState,
          isFree: item.isAccessibleForFree === true,
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log(`[trybooking] No JSON-LD events found for ${fallbackCity}; full HTML parser needed (add cheerio)`);
  }

  return events;
}
