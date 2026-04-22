import type { SourceAdapter, RawEvent } from "@/types/event";
import { AU_LOCATIONS, AU_SEARCH_RADIUS_KM } from "../au-locations";

const API_BASE = "https://app.ticketmaster.com/discovery/v2";

interface TmEvent {
  id: string;
  name: string;
  info?: string;
  url: string;
  images?: Array<{ url: string; width: number; height: number }>;
  dates: {
    start: { dateTime?: string; localDate?: string };
    end?: { dateTime?: string };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      address?: { line1: string };
      city?: { name: string };
      state?: { stateCode: string };
      country?: { countryCode: string };
      location?: { latitude: string; longitude: string };
    }>;
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
  }>;
}

interface TmResponse {
  _embedded?: { events: TmEvent[] };
  page: { number: number; totalPages: number };
}

const SEGMENT_MAP: Record<string, RawEvent["category"]> = {
  Music: "MUSIC",
  Sports: "SPORTS",
  "Arts & Theatre": "ARTS",
  Film: "ARTS",
  Miscellaneous: "OTHER",
};

/**
 * Ticketmaster Discovery API adapter for Australian events.
 * Searches all major AU cities. Requires TICKETMASTER_API_KEY env var (consumer key).
 */
export class TicketmasterAdapter implements SourceAdapter {
  readonly name = "ticketmaster";

  async fetch(): Promise<RawEvent[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.warn("[ticketmaster] TICKETMASTER_API_KEY not set, skipping");
      return [];
    }

    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of AU_LOCATIONS) {
      console.log(`[ticketmaster] Fetching ${loc.name} (${loc.state})...`);
      let page = 0;
      let totalPages = 1;

      while (page < totalPages && page < 2) {
        const url = new URL(`${API_BASE}/events.json`);
        url.searchParams.set("apikey", apiKey);
        url.searchParams.set("latlong", `${loc.lat},${loc.lon}`);
        url.searchParams.set("radius", String(AU_SEARCH_RADIUS_KM));
        url.searchParams.set("unit", "km");
        url.searchParams.set("countryCode", "AU");
        url.searchParams.set("size", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("sort", "date,asc");

        const res = await fetch(url.toString());

        if (!res.ok) {
          console.error(`[ticketmaster] API error ${res.status} for ${loc.name}: ${await res.text()}`);
          break;
        }

        const data: TmResponse = await res.json();
        totalPages = data.page.totalPages;

        if (data._embedded?.events) {
          for (const tm of data._embedded.events) {
            if (!seen.has(tm.id)) {
              seen.add(tm.id);
              allEvents.push(mapEvent(tm, loc));
            }
          }
        }

        page++;
      }
    }

    return allEvents;
  }
}

function mapEvent(tm: TmEvent, fallback: { name: string; state: string }): RawEvent {
  const venue = tm._embedded?.venues?.[0];
  const bestImage = tm.images
    ?.sort((a, b) => b.width - a.width)
    ?.[0];
  const priceRange = tm.priceRanges?.[0];
  const segment = tm.classifications?.[0]?.segment?.name;

  const startDate = tm.dates.start.dateTime
    ? new Date(tm.dates.start.dateTime)
    : new Date(tm.dates.start.localDate + "T00:00:00+10:00");

  return {
    sourceId: tm.id,
    name: tm.name,
    description: tm.info ?? undefined,
    startDate,
    endDate: tm.dates.end?.dateTime
      ? new Date(tm.dates.end.dateTime)
      : undefined,
    imageUrl: bestImage?.url ?? undefined,
    url: tm.url,
    venueName: venue?.name ?? undefined,
    venueAddress: venue?.address?.line1 ?? undefined,
    city: venue?.city?.name ?? fallback.name,
    state: venue?.state?.stateCode ?? fallback.state,
    latitude: venue?.location?.latitude
      ? parseFloat(venue.location.latitude)
      : undefined,
    longitude: venue?.location?.longitude
      ? parseFloat(venue.location.longitude)
      : undefined,
    category: SEGMENT_MAP[segment ?? ""] ?? "OTHER",
    isFree: priceRange ? priceRange.min === 0 : false,
    priceMin: priceRange?.min ?? undefined,
    priceMax: priceRange?.max ?? undefined,
    ticketUrl: tm.url,
    rawData: tm,
  };
}
