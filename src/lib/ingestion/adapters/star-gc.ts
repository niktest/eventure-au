import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * The Star Gold Coast scraper adapter.
 * Scrapes star.com.au/goldcoast for entertainment/show listings.
 */
export class StarGCAdapter implements SourceAdapter {
  readonly name = "stargc";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.STAR_GC_URL ?? "https://www.star.com.au/goldcoast";
    console.log(`[stargc] Scraping ${baseUrl}/whats-on`);

    try {
      const res = await fetch(`${baseUrl}/whats-on`, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[stargc] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseStarGCEvents(html);
    } catch (err) {
      console.error("[stargc] Fetch failed:", err);
      return [];
    }
  }
}

function parseStarGCEvents(html: string): RawEvent[] {
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
          sourceId: item.url ?? `stargc-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: item.url ?? undefined,
          venueName: item.location?.name ?? "The Star Gold Coast",
          venueAddress: "1 Casino Dr, Broadbeach QLD 4218",
          city: "Gold Coast",
          state: "QLD",
          latitude: -28.0328,
          longitude: 153.4296,
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[stargc] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
