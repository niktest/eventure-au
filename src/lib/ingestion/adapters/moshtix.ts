import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Moshtix scraper adapter.
 * Scrapes moshtix.com.au for Gold Coast live music/event listings.
 */
export class MoshtixAdapter implements SourceAdapter {
  readonly name = "moshtix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MOSHTIX_URL ?? "https://www.moshtix.com.au";
    const searchUrl = `${baseUrl}/v2/search?location=gold-coast`;
    console.log(`[moshtix] Scraping ${searchUrl}`);

    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[moshtix] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseMoshtixEvents(html, baseUrl);
    } catch (err) {
      console.error("[moshtix] Fetch failed:", err);
      return [];
    }
  }
}

function parseMoshtixEvents(html: string, baseUrl: string): RawEvent[] {
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
          city: "Gold Coast",
          state: "QLD",
          category: "MUSIC",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  if (events.length === 0) {
    console.log("[moshtix] No JSON-LD events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
