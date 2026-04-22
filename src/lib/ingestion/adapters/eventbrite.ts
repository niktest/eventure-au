import type { SourceAdapter, RawEvent } from "@/types/event";
import { AU_LOCATIONS, AU_SEARCH_RADIUS_KM } from "../au-locations";

const API_BASE = "https://www.eventbriteapi.com/v3";

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string } | null;
  start: { utc: string; local: string };
  end: { utc: string; local: string } | null;
  url: string;
  logo: { original: { url: string } } | null;
  venue?: {
    name: string;
    address: {
      localized_address_display: string;
      city: string;
      region: string;
      latitude: string;
      longitude: string;
    };
  };
  is_free: boolean;
  ticket_availability?: {
    minimum_ticket_price?: { major_value: string; currency: string };
    maximum_ticket_price?: { major_value: string; currency: string };
  };
  category_id: string | null;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: { has_more_items: boolean; page_number: number; page_count: number };
}

const CATEGORY_MAP: Record<string, RawEvent["category"]> = {
  "103": "MUSIC",
  "104": "ARTS",
  "105": "SPORTS",
  "108": "SPORTS",
  "110": "FOOD_DRINK",
  "113": "COMMUNITY",
  "115": "FAMILY",
  "116": "COMMUNITY",
  "199": "OTHER",
};

/**
 * Eventbrite API adapter for Australian events.
 * Searches all major AU cities. Requires EVENTBRITE_API_KEY env var (OAuth private token).
 */
export class EventbriteAdapter implements SourceAdapter {
  readonly name = "eventbrite";

  async fetch(): Promise<RawEvent[]> {
    const token = process.env.EVENTBRITE_API_KEY;
    if (!token) {
      console.warn("[eventbrite] EVENTBRITE_API_KEY not set, skipping");
      return [];
    }

    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of AU_LOCATIONS) {
      console.log(`[eventbrite] Fetching ${loc.name} (${loc.state})...`);
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 2) {
        const url = new URL(`${API_BASE}/events/search/`);
        url.searchParams.set("location.latitude", String(loc.lat));
        url.searchParams.set("location.longitude", String(loc.lon));
        url.searchParams.set("location.within", `${AU_SEARCH_RADIUS_KM}km`);
        url.searchParams.set("expand", "venue,ticket_availability");
        url.searchParams.set("page", String(page));

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error(`[eventbrite] API error ${res.status} for ${loc.name}: ${await res.text()}`);
          break;
        }

        const data: EventbriteResponse = await res.json();

        for (const eb of data.events) {
          if (!seen.has(eb.id)) {
            seen.add(eb.id);
            allEvents.push(mapEvent(eb, loc));
          }
        }

        hasMore = data.pagination.has_more_items;
        page++;
      }
    }

    return allEvents;
  }
}

function mapEvent(eb: EventbriteEvent, fallback: { name: string; state: string }): RawEvent {
  return {
    sourceId: eb.id,
    name: eb.name.text,
    description: eb.description?.text ?? undefined,
    startDate: new Date(eb.start.utc),
    endDate: eb.end ? new Date(eb.end.utc) : undefined,
    imageUrl: eb.logo?.original?.url ?? undefined,
    url: eb.url,
    venueName: eb.venue?.name ?? undefined,
    venueAddress: eb.venue?.address?.localized_address_display ?? undefined,
    city: eb.venue?.address?.city ?? fallback.name,
    state: eb.venue?.address?.region ?? fallback.state,
    latitude: eb.venue?.address?.latitude
      ? parseFloat(eb.venue.address.latitude)
      : undefined,
    longitude: eb.venue?.address?.longitude
      ? parseFloat(eb.venue.address.longitude)
      : undefined,
    category: CATEGORY_MAP[eb.category_id ?? ""] ?? "OTHER",
    isFree: eb.is_free,
    priceMin: eb.ticket_availability?.minimum_ticket_price
      ? parseFloat(eb.ticket_availability.minimum_ticket_price.major_value)
      : undefined,
    priceMax: eb.ticket_availability?.maximum_ticket_price
      ? parseFloat(eb.ticket_availability.maximum_ticket_price.major_value)
      : undefined,
    ticketUrl: eb.url,
    rawData: eb,
  };
}
