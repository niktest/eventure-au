import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * City of Gold Coast events calendar scraper adapter.
 * Scrapes cityofgoldcoast.com.au for civic/community event listings.
 */
export class CityOfGCAdapter implements SourceAdapter {
  readonly name = "cityofgc";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl =
      process.env.CITY_OF_GC_URL ?? "https://www.cityofgoldcoast.com.au";
    const eventsUrl = `${baseUrl}/Council-region/Events`;
    console.log(`[cityofgc] Scraping ${eventsUrl}`);

    try {
      const res = await fetch(eventsUrl, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[cityofgc] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseCityOfGCEvents(html);
    } catch (err) {
      console.error("[cityofgc] Fetch failed:", err);
      return [];
    }
  }
}

function parseCityOfGCEvents(html: string): RawEvent[] {
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
        events.push({
          sourceId: item.url ?? `cityofgc-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: item.url ?? undefined,
          venueName: item.location?.name ?? undefined,
          venueAddress: item.location?.address?.streetAddress ?? undefined,
          city: "Gold Coast",
          state: "QLD",
          category: "COMMUNITY",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[cityofgc] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
