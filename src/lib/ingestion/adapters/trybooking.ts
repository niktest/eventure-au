import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * TryBooking scraper adapter.
 * Scrapes trybooking.com for Gold Coast community event listings.
 */
export class TryBookingAdapter implements SourceAdapter {
  readonly name = "trybooking";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.TRYBOOKING_URL ?? "https://www.trybooking.com";
    const searchUrl = `${baseUrl}/search?search=Gold+Coast`;
    console.log(`[trybooking] Scraping ${searchUrl}`);

    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[trybooking] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseTryBookingEvents(html, baseUrl);
    } catch (err) {
      console.error("[trybooking] Fetch failed:", err);
      return [];
    }
  }
}

function parseTryBookingEvents(html: string, baseUrl: string): RawEvent[] {
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
          city: "Gold Coast",
          state: "QLD",
          isFree: item.isAccessibleForFree === true,
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[trybooking] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
