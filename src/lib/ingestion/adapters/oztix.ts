import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { stripHtmlDescription } from "../utils/scrape-helpers";

// Oztix's public site (oztix.com.au) is a Vue.js SPA — the `/search` HTML
// shell never embeds any event data, so HTML/JSON-LD scraping yields zero
// results. The site itself queries Algolia directly with a public
// search-only API key extracted from its bundled JS. We hit the same index
// and paginate per AU state (Algolia caps a single result set at 1000 hits
// via `paginationLimitedTo`, so slicing by state is necessary to reach the
// full ~3.5k AU catalogue).
const ALGOLIA_APP_ID = "ICGFYQWGTD";
const ALGOLIA_API_KEY = "bc11adffff267d354ad0a04aedebb5b5";
const ALGOLIA_INDEX = "prod_oztix_eventguide";
const HITS_PER_PAGE = 1000;
const MAX_PAGES_PER_STATE = 5;
const PAGE_DELAY_MS = 150;

// AU states + ACT/NT. Filtering by `Venue.State` is the natural axis the
// site exposes and matches the available facets in the index.
const AU_STATES = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "ACT", "NT"];

interface OztixHit {
  EventId?: number;
  EventGuid?: string;
  EventName?: string;
  EventDescription?: string;
  EventImage1?: string;
  HomepageImage?: string;
  EventUrl?: string;
  DateStart?: string;
  DateEnd?: string;
  MinPrice?: number;
  Categories?: string[];
  Venue?: {
    Name?: string;
    Address?: string;
    Locality?: string;
    State?: string;
    Postcode?: string;
    Country?: string;
    Timezone?: string;
  };
  _geoloc?: { lat?: number; lng?: number };
  IsCancelled?: boolean;
}

interface AlgoliaResponse {
  hits: OztixHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

/**
 * Oztix scraper adapter.
 *
 * Fully client-side rendered Vue.js SPA — there is no HTML to scrape. We
 * paginate the Algolia index (`prod_oztix_eventguide`) that the site uses
 * itself, sliced by `Venue.State` so we can walk past Algolia's per-query
 * 1000-hit cap and cover the entire AU catalogue.
 */
export class OztixAdapter implements SourceAdapter {
  readonly name = "oztix";

  async fetch(): Promise<RawEvent[]> {
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const state of AU_STATES) {
      let page = 0;
      let stateTotal: number | null = null;
      let stateAdded = 0;

      while (page < MAX_PAGES_PER_STATE) {
        let data: AlgoliaResponse;
        try {
          const res = await fetch(algoliaUrl, {
            method: "POST",
            headers: {
              "User-Agent": SCRAPER_USER_AGENT,
              "X-Algolia-API-Key": ALGOLIA_API_KEY,
              "X-Algolia-Application-Id": ALGOLIA_APP_ID,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: "",
              page,
              hitsPerPage: HITS_PER_PAGE,
              facetFilters: [[`Venue.State:${state}`]],
            }),
          });
          if (!res.ok) {
            console.error(`[oztix] ${state} page ${page}: HTTP ${res.status}`);
            break;
          }
          data = (await res.json()) as AlgoliaResponse;
        } catch (err) {
          console.error(`[oztix] ${state} page ${page} fetch failed:`, err);
          break;
        }

        if (stateTotal === null) stateTotal = data.nbHits;

        const hits = data.hits ?? [];
        if (hits.length === 0) break;

        for (const hit of hits) {
          const ev = mapHit(hit, state);
          if (!ev) continue;
          if (seen.has(ev.sourceId)) continue;
          seen.add(ev.sourceId);
          allEvents.push(ev);
          stateAdded++;
        }

        // Algolia returns the resolved page count after the first request.
        if (page + 1 >= data.nbPages) break;

        page++;
        if (PAGE_DELAY_MS > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
      }

      console.log(
        `[oztix]   -> ${state}: +${stateAdded}/${stateTotal ?? "?"} (total=${allEvents.length})`
      );
    }

    return allEvents;
  }
}

function mapHit(hit: OztixHit, fallbackState: string): RawEvent | null {
  if (!hit.EventId || !hit.EventName) return null;
  if (hit.IsCancelled) return null;

  const start = hit.DateStart ? new Date(hit.DateStart) : null;
  if (!start || Number.isNaN(start.getTime())) return null;

  const end = hit.DateEnd ? new Date(hit.DateEnd) : undefined;

  return {
    sourceId: `oztix-${hit.EventId}`,
    name: hit.EventName,
    description: stripHtmlDescription(hit.EventDescription),
    startDate: start,
    endDate: end && !Number.isNaN(end.getTime()) ? end : undefined,
    imageUrl: hit.EventImage1 ?? hit.HomepageImage ?? undefined,
    url: hit.EventUrl ?? undefined,
    venueName: hit.Venue?.Name ?? undefined,
    venueAddress: hit.Venue?.Address ?? undefined,
    city: hit.Venue?.Locality ?? undefined,
    state: hit.Venue?.State ?? fallbackState,
    latitude:
      typeof hit._geoloc?.lat === "number" ? hit._geoloc.lat : undefined,
    longitude:
      typeof hit._geoloc?.lng === "number" ? hit._geoloc.lng : undefined,
    category: "MUSIC",
    priceMin: typeof hit.MinPrice === "number" ? hit.MinPrice : undefined,
    ticketUrl: hit.EventUrl ?? undefined,
    ticketProvider: "oztix",
    rawData: hit,
  };
}
