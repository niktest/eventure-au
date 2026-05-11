import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";

// Megatix is a Nuxt SPA whose `/events` HTML embeds no JSON-LD — the
// site hydrates from a Laravel-style JSON API at
// `/api/v2/events/search?page=N`, paginated 8 per page with a `meta.last_page`
// terminator. We walk pages until we reach `last_page`, then dedup by id.
const LISTING_PAGE_DELAY_MS = 200;
const MAX_PAGES = 200;

interface MegatixListing {
  id: number;
  name: string;
  slug: string;
  venue_name?: string | null;
  cover?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  is_published?: boolean;
  is_on_sale?: boolean;
  display_price?: string | null;
  is_recurring?: boolean;
}

interface MegatixSearchResponse {
  data: MegatixListing[];
  meta?: {
    current_page?: number;
    last_page?: number;
    total?: number;
  };
}

/**
 * Megatix scraper adapter.
 *
 * Paginates the public JSON listing endpoint `/api/v2/events/search?page=N`.
 * The endpoint ignores `state` and `per_page` query parameters — it just
 * returns the global AU catalogue 8 events per page, terminating at
 * `meta.last_page`. We walk until exhausted and rely on `(source, sourceId)`
 * dedup since the listing has no overlap when walked sequentially.
 */
export class MegatixAdapter implements SourceAdapter {
  readonly name = "megatix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MEGATIX_URL ?? "https://megatix.com.au";
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    let page = 1;
    let lastPage: number | null = null;
    let total: number | null = null;

    while (page <= MAX_PAGES) {
      let data: MegatixSearchResponse;
      try {
        const res = await fetch(`${baseUrl}/api/v2/events/search?page=${page}`, {
          headers: {
            "User-Agent": SCRAPER_USER_AGENT,
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          console.error(`[megatix] page ${page}: HTTP ${res.status}`);
          break;
        }
        data = (await res.json()) as MegatixSearchResponse;
      } catch (err) {
        console.error(`[megatix] page ${page} fetch failed:`, err);
        break;
      }

      if (lastPage === null) {
        lastPage = data.meta?.last_page ?? null;
        total = data.meta?.total ?? null;
        console.log(
          `[megatix] Listing reports ${total ?? "?"} event(s) across ${lastPage ?? "?"} page(s)`
        );
      }

      const items = data.data ?? [];
      let newOnPage = 0;
      for (const item of items) {
        const ev = mapListing(item, baseUrl);
        if (!ev) continue;
        if (seen.has(ev.sourceId)) continue;
        seen.add(ev.sourceId);
        allEvents.push(ev);
        newOnPage++;
      }
      console.log(
        `[megatix] Page ${page}${lastPage ? `/${lastPage}` : ""}: parsed ${items.length}, ${newOnPage} new (total=${allEvents.length})`
      );

      if (items.length === 0) break;
      if (lastPage !== null && page >= lastPage) break;

      page++;
      if (LISTING_PAGE_DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, LISTING_PAGE_DELAY_MS));
      }
    }

    return allEvents;
  }
}

function mapListing(item: MegatixListing, baseUrl: string): RawEvent | null {
  if (!item.id || !item.name) return null;
  if (item.is_published === false) return null;
  if (item.is_recurring) return null;

  const start = item.start_datetime ? new Date(item.start_datetime) : null;
  if (!start || Number.isNaN(start.getTime())) return null;

  const end = item.end_datetime ? new Date(item.end_datetime) : undefined;
  const eventUrl = item.slug ? `${baseUrl}/events/${item.slug}` : undefined;

  return {
    sourceId: `megatix-${item.id}`,
    name: item.name,
    startDate: start,
    endDate: end && !Number.isNaN(end.getTime()) ? end : undefined,
    imageUrl: item.cover ?? undefined,
    url: eventUrl,
    venueName: item.venue_name ?? undefined,
    ticketUrl: eventUrl,
    ticketProvider: "megatix",
    rawData: item,
  };
}
