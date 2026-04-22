import type { SourceAdapter, RawEvent } from "@/types/event";

/** AU state codes to search on Megatix */
const MEGATIX_STATES = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"];

/**
 * Megatix scraper adapter.
 * Scrapes megatix.com.au for event listings across all Australian states.
 * Uses JSON-LD extraction with fallback to embedded page data.
 */
export class MegatixAdapter implements SourceAdapter {
  readonly name = "megatix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MEGATIX_URL ?? "https://megatix.com.au";
    const events: RawEvent[] = [];

    // Fetch all events + each state individually
    const searchUrls = [
      { url: `${baseUrl}/events`, label: "all" },
      ...MEGATIX_STATES.map((state) => ({
        url: `${baseUrl}/events?state=${state}`,
        label: state,
      })),
    ];

    for (const { url: searchUrl, label } of searchUrls) {
      console.log(`[megatix] Scraping ${label}: ${searchUrl}`);

      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (!res.ok) {
          console.error(`[megatix] HTTP ${res.status} for ${label}`);
          continue;
        }

        const html = await res.text();
        const parsed = parseMegatixEvents(html, baseUrl);
        events.push(...parsed);
      } catch (err) {
        console.error(`[megatix] Fetch failed for ${label}:`, err);
      }
    }

    // Deduplicate by sourceId within this adapter
    const seen = new Set<string>();
    return events.filter((e) => {
      if (seen.has(e.sourceId)) return false;
      seen.add(e.sourceId);
      return true;
    });
  }
}

function parseMegatixEvents(html: string, baseUrl: string): RawEvent[] {
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
        if (item["@type"] !== "Event" && item["@type"] !== "MusicEvent") continue;
        const eventUrl = item.url?.startsWith("http") ? item.url : `${baseUrl}${item.url ?? ""}`;
        events.push({
          sourceId: item.url ?? `megatix-${item.name?.replace(/\s+/g, "-").toLowerCase()}`,
          name: item.name ?? "Unknown Event",
          description: item.description ?? undefined,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : undefined,
          imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] ?? undefined,
          url: eventUrl,
          venueName: item.location?.name ?? undefined,
          venueAddress: item.location?.address?.streetAddress
            ?? (typeof item.location?.address === "string" ? item.location.address : undefined),
          city: item.location?.address?.addressLocality ?? undefined,
          state: item.location?.address?.addressRegion ?? undefined,
          latitude: item.location?.geo?.latitude ? parseFloat(item.location.geo.latitude) : undefined,
          longitude: item.location?.geo?.longitude ? parseFloat(item.location.geo.longitude) : undefined,
          isFree: item.isAccessibleForFree === true,
          priceMin: item.offers?.lowPrice ? parseFloat(item.offers.lowPrice) : undefined,
          priceMax: item.offers?.highPrice ? parseFloat(item.offers.highPrice) : undefined,
          ticketUrl: item.offers?.url ?? eventUrl,
          ticketProvider: "megatix",
          rawData: item,
        });
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  // Strategy 2: Extract from __NEXT_DATA__ or __NUXT__ embedded data
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
            sourceId: String(item.id ?? item.slug ?? `megatix-${(item.name ?? item.title)?.replace(/\s+/g, "-").toLowerCase()}`),
            name: item.name ?? item.title ?? "Unknown Event",
            description: item.description ?? item.summary ?? undefined,
            startDate: item.startDate ?? item.start_date ?? item.date ?? new Date().toISOString(),
            endDate: item.endDate ?? item.end_date ?? undefined,
            imageUrl: item.imageUrl ?? item.image ?? item.thumbnail ?? item.cover_image ?? undefined,
            url: item.url ? (item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`) : `${baseUrl}/events/${item.slug ?? item.id}`,
            venueName: item.venue?.name ?? item.venueName ?? undefined,
            venueAddress: item.venue?.address ?? item.venueAddress ?? undefined,
            city: item.venue?.city ?? item.city ?? undefined,
            state: item.venue?.state ?? item.state ?? undefined,
            isFree: item.isFree ?? false,
            priceMin: item.priceMin ?? item.price_min ?? undefined,
            priceMax: item.priceMax ?? item.price_max ?? undefined,
            ticketUrl: item.ticketUrl ?? item.url ?? undefined,
            ticketProvider: "megatix",
            rawData: item,
          });
        }
      } catch {
        // Ignore malformed __NEXT_DATA__
      }
    }
  }

  if (events.length === 0) {
    console.log("[megatix] No structured events found; full HTML parser needed (add cheerio)");
  }

  return events;
}
