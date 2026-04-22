import type { SourceAdapter, RawEvent } from "@/types/event";

/** Moshtix location slugs mapped from city names */
const MOSHTIX_LOCATIONS = [
  { slug: "gold-coast", city: "Gold Coast", state: "QLD" },
  { slug: "brisbane", city: "Brisbane", state: "QLD" },
  { slug: "sydney", city: "Sydney", state: "NSW" },
  { slug: "melbourne", city: "Melbourne", state: "VIC" },
  { slug: "perth", city: "Perth", state: "WA" },
  { slug: "adelaide", city: "Adelaide", state: "SA" },
  { slug: "hobart", city: "Hobart", state: "TAS" },
  { slug: "darwin", city: "Darwin", state: "NT" },
  { slug: "canberra", city: "Canberra", state: "ACT" },
  { slug: "newcastle", city: "Newcastle", state: "NSW" },
  { slug: "sunshine-coast", city: "Sunshine Coast", state: "QLD" },
  { slug: "cairns", city: "Cairns", state: "QLD" },
  { slug: "wollongong", city: "Wollongong", state: "NSW" },
  { slug: "geelong", city: "Geelong", state: "VIC" },
  { slug: "townsville", city: "Townsville", state: "QLD" },
];

/**
 * Moshtix scraper adapter.
 * Scrapes moshtix.com.au for Australian live music/event listings.
 * Searches all major AU cities.
 */
export class MoshtixAdapter implements SourceAdapter {
  readonly name = "moshtix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MOSHTIX_URL ?? "https://www.moshtix.com.au";
    const allEvents: RawEvent[] = [];

    for (const loc of MOSHTIX_LOCATIONS) {
      const searchUrl = `${baseUrl}/v2/search?location=${loc.slug}`;
      console.log(`[moshtix] Scraping ${loc.city} (${loc.state})`);

      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
          },
        });

        if (!res.ok) {
          console.error(`[moshtix] HTTP ${res.status} for ${loc.city}`);
          continue;
        }

        const html = await res.text();
        const events = parseMoshtixEvents(html, baseUrl, loc.city, loc.state);
        allEvents.push(...events);
      } catch (err) {
        console.error(`[moshtix] Fetch failed for ${loc.city}:`, err);
      }
    }

    return allEvents;
  }
}

function parseMoshtixEvents(html: string, baseUrl: string, fallbackCity: string, fallbackState: string): RawEvent[] {
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
          sourceId: item.url ?? `moshtix-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
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
          category: "MUSIC",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log(`[moshtix] No JSON-LD events found for ${fallbackCity}; full HTML parser needed (add cheerio)`);
  }

  return events;
}
