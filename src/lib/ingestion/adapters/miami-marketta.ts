import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Miami Marketta scraper adapter.
 * Scrapes miamimarketta.com for market/food/music event listings.
 */
export class MiamiMarkettaAdapter implements SourceAdapter {
  readonly name = "miamimarketta";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MIAMI_MARKETTA_URL ?? "https://www.miamimarketta.com";
    console.log(`[miamimarketta] Scraping ${baseUrl}`);

    try {
      const res = await fetch(baseUrl, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[miamimarketta] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseMiamiMarkettaEvents(html);
    } catch (err) {
      console.error("[miamimarketta] Fetch failed:", err);
      return [];
    }
  }
}

function parseMiamiMarkettaEvents(html: string): RawEvent[] {
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
          sourceId: item.url ?? `marketta-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: item.url ?? undefined,
          venueName: "Miami Marketta",
          venueAddress: "23 Hillcrest Parade, Miami QLD 4220",
          city: "Gold Coast",
          state: "QLD",
          latitude: -28.0722,
          longitude: 153.4407,
          category: "MARKETS",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[miamimarketta] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
