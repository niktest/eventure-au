import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Sandstone Point Hotel scraper adapter.
 * Scrapes sandstonepointhotel.com.au for live music/outdoor event listings.
 */
export class SandstonePointAdapter implements SourceAdapter {
  readonly name = "sandstonepoint";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl =
      process.env.SANDSTONE_POINT_URL ?? "https://www.sandstonepointhotel.com.au";
    console.log(`[sandstonepoint] Scraping ${baseUrl}/whats-on`);

    try {
      const res = await fetch(`${baseUrl}/whats-on`, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[sandstonepoint] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseSandstonePointEvents(html);
    } catch (err) {
      console.error("[sandstonepoint] Fetch failed:", err);
      return [];
    }
  }
}

function parseSandstonePointEvents(html: string): RawEvent[] {
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
          sourceId: item.url ?? `sandstone-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: item.url ?? undefined,
          venueName: "Sandstone Point Hotel",
          venueAddress: "1800 Bribie Island Rd, Sandstone Point QLD 4511",
          city: "Gold Coast",
          state: "QLD",
          latitude: -27.0833,
          longitude: 153.1333,
          category: "MUSIC",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[sandstonepoint] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
