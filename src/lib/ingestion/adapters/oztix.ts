import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Oztix scraper adapter.
 * Scrapes oztix.com.au event listings for Gold Coast and Brisbane events.
 * Oztix is Australia's largest independent ticketing company.
 * Falls back to JSON-LD parsing from search results pages.
 */
export class OztixAdapter implements SourceAdapter {
  readonly name = "oztix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.OZTIX_URL ?? "https://www.oztix.com.au";
    const events: RawEvent[] = [];

    const searches = [
      { path: "/search?q=gold+coast", city: "Gold Coast" },
      { path: "/search?q=brisbane", city: "Brisbane" },
    ];

    for (const search of searches) {
      const searchUrl = `${baseUrl}${search.path}`;
      console.log(`[oztix] Scraping ${searchUrl}`);

      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (!res.ok) {
          console.error(`[oztix] HTTP ${res.status} for ${search.city}`);
          continue;
        }

        const html = await res.text();
        const parsed = parseOztixEvents(html, baseUrl, search.city);
        events.push(...parsed);
      } catch (err) {
        console.error(`[oztix] Fetch failed for ${search.city}:`, err);
      }
    }

    return events;
  }
}

function parseOztixEvents(html: string, baseUrl: string, fallbackCity: string): RawEvent[] {
  const events: RawEvent[] = [];

  // Strategy 1: Extract JSON-LD structured data
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item["@type"] !== "Event" && item["@type"] !== "MusicEvent") continue;
        const eventUrl = item.url?.startsWith("http") ? item.url : `${baseUrl}${item.url ?? ""}`;
        events.push({
          sourceId: item.url ?? `oztix-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: eventUrl,
          venueName: item.location?.name ?? undefined,
          venueAddress: item.location?.address?.streetAddress
            ?? (typeof item.location?.address === "string" ? item.location.address : undefined),
          city: item.location?.address?.addressLocality ?? fallbackCity,
          state: item.location?.address?.addressRegion ?? "QLD",
          latitude: item.location?.geo?.latitude ? parseFloat(item.location.geo.latitude) : undefined,
          longitude: item.location?.geo?.longitude ? parseFloat(item.location.geo.longitude) : undefined,
          category: "MUSIC",
          isFree: item.isAccessibleForFree === true,
          priceMin: item.offers?.lowPrice ? parseFloat(item.offers.lowPrice) : undefined,
          priceMax: item.offers?.highPrice ? parseFloat(item.offers.highPrice) : undefined,
          ticketUrl: item.offers?.url ?? eventUrl,
          ticketProvider: "oztix",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  // Strategy 2: Extract from embedded Next.js / Nuxt data or inline JSON
  if (events.length === 0) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        const eventList = pageProps?.events ?? pageProps?.results ?? [];
        for (const item of eventList) {
          if (!item.name && !item.title) continue;
          events.push({
            sourceId: String(item.id ?? item.slug ?? `oztix-${(item.name ?? item.title)?.replace(/\s+/g, "-").toLowerCase()}`),
            name: item.name ?? item.title ?? "Unknown Event",
            description: item.description ?? item.summary ?? undefined,
            startDate: item.startDate ?? item.start_date ?? item.date ?? new Date().toISOString(),
            endDate: item.endDate ?? item.end_date ?? undefined,
            imageUrl: item.imageUrl ?? item.image ?? item.thumbnail ?? undefined,
            url: item.url ? (item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`) : undefined,
            venueName: item.venue?.name ?? item.venueName ?? undefined,
            venueAddress: item.venue?.address ?? item.venueAddress ?? undefined,
            city: item.venue?.city ?? fallbackCity,
            state: item.venue?.state ?? "QLD",
            category: "MUSIC",
            ticketUrl: item.ticketUrl ?? item.url ?? undefined,
            ticketProvider: "oztix",
            rawData: item,
          });
        }
      } catch {
        // Ignore malformed __NEXT_DATA__
      }
    }
  }

  if (events.length === 0) {
    console.log(`[oztix] No structured events found for ${fallbackCity}; full HTML parser needed (add cheerio)`);
  }

  return events;
}
