import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Visit Brisbane / Brisbane City Council scraper adapter.
 * Scrapes visit.brisbane.qld.au for event listings.
 * This source is backed by the ATDW (Australian Tourism Data Warehouse)
 * via a Sitecore CMS. Extracts JSON-LD and embedded page data.
 * Extends Eventure coverage from Gold Coast into Brisbane.
 */
export class VisitBrisbaneAdapter implements SourceAdapter {
  readonly name = "visitbrisbane";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.VISIT_BRISBANE_URL ?? "https://visit.brisbane.qld.au";
    const searchUrl = `${baseUrl}/whats-on`;
    console.log(`[visitbrisbane] Scraping ${searchUrl}`);

    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      if (!res.ok) {
        console.error(`[visitbrisbane] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return parseVisitBrisbaneEvents(html, baseUrl);
    } catch (err) {
      console.error("[visitbrisbane] Fetch failed:", err);
      return [];
    }
  }
}

function parseVisitBrisbaneEvents(html: string, baseUrl: string): RawEvent[] {
  const events: RawEvent[] = [];

  // Strategy 1: JSON-LD structured data
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item["@type"] !== "Event") continue;
        const eventUrl = item.url?.startsWith("http") ? item.url : `${baseUrl}${item.url ?? ""}`;
        events.push({
          sourceId: item.url ?? `visitbrisbane-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: eventUrl,
          venueName: item.location?.name ?? undefined,
          venueAddress: item.location?.address?.streetAddress
            ?? (typeof item.location?.address === "string" ? item.location.address : undefined),
          city: item.location?.address?.addressLocality ?? "Brisbane",
          state: item.location?.address?.addressRegion ?? "QLD",
          latitude: item.location?.geo?.latitude ? parseFloat(item.location.geo.latitude) : undefined,
          longitude: item.location?.geo?.longitude ? parseFloat(item.location.geo.longitude) : undefined,
          isFree: item.isAccessibleForFree === true,
          priceMin: item.offers?.lowPrice ? parseFloat(item.offers.lowPrice) : undefined,
          priceMax: item.offers?.highPrice ? parseFloat(item.offers.highPrice) : undefined,
          ticketUrl: item.offers?.url ?? eventUrl,
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  // Strategy 2: Extract from __N_SSP / Next.js embedded props
  if (events.length === 0) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        const eventList = pageProps?.events ?? pageProps?.results ?? pageProps?.items ?? [];
        for (const item of eventList) {
          if (!item.name && !item.title) continue;
          events.push({
            sourceId: String(item.id ?? item.slug ?? `visitbrisbane-${(item.name ?? item.title)?.replace(/\s+/g, "-").toLowerCase()}`),
            name: item.name ?? item.title ?? "Unknown Event",
            description: item.description ?? item.summary ?? undefined,
            startDate: item.startDate ?? item.start_date ?? item.date ?? new Date().toISOString(),
            endDate: item.endDate ?? item.end_date ?? undefined,
            imageUrl: item.imageUrl ?? item.image ?? item.thumbnail ?? undefined,
            url: item.url ? (item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`) : undefined,
            venueName: item.venue?.name ?? item.venueName ?? undefined,
            venueAddress: item.venue?.address ?? item.venueAddress ?? undefined,
            city: "Brisbane",
            state: "QLD",
            rawData: item,
          });
        }
      } catch {
        // Ignore malformed __NEXT_DATA__
      }
    }
  }

  if (events.length === 0) {
    console.log("[visitbrisbane] No structured events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
