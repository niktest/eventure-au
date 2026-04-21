import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Destination Gold Coast scraper adapter.
 * Scrapes destinationgoldcoast.com/things-to-do/events for event listings.
 *
 * Requires implementation of HTML parsing (e.g. cheerio) once dependencies
 * are added. Currently returns [] and logs a notice.
 */
export class DestinationGCAdapter implements SourceAdapter {
  readonly name = "destinationgc";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.DESTINATION_GC_URL ?? "https://www.destinationgoldcoast.com";
    console.log(`[destinationgc] Scraping ${baseUrl}/things-to-do/events`);

    try {
      const res = await fetch(`${baseUrl}/things-to-do/events`, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[destinationgc] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseDestinationGCEvents(html);
    } catch (err) {
      console.error("[destinationgc] Fetch failed:", err);
      return [];
    }
  }
}

function parseDestinationGCEvents(html: string): RawEvent[] {
  // Extract JSON-LD structured data if available
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
          sourceId: item.url ?? item.name?.replace(/\s+/g, "-").toLowerCase() ?? "",
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
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  if (events.length === 0) {
    console.log("[destinationgc] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
