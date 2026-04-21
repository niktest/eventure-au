import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * HOTA (Home of the Arts) scraper adapter.
 * Scrapes hota.com.au/whats-on for event listings.
 *
 * Uses JSON-LD extraction as primary strategy, with fallback logging
 * when full HTML parsing (cheerio) is needed.
 */
export class HOTAAdapter implements SourceAdapter {
  readonly name = "hota";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.HOTA_URL ?? "https://www.hota.com.au";
    console.log(`[hota] Scraping ${baseUrl}/whats-on`);

    try {
      const res = await fetch(`${baseUrl}/whats-on`, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[hota] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseHOTAEvents(html);
    } catch (err) {
      console.error("[hota] Fetch failed:", err);
      return [];
    }
  }
}

function parseHOTAEvents(html: string): RawEvent[] {
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
          sourceId: item.url ?? `hota-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: item.url ?? undefined,
          venueName: item.location?.name ?? "HOTA",
          venueAddress: "135 Bundall Rd, Surfers Paradise QLD 4217",
          city: "Gold Coast",
          state: "QLD",
          latitude: -28.0025,
          longitude: 153.4090,
          category: "ARTS",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[hota] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
