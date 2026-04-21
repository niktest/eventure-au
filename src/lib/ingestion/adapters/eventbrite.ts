import type { SourceAdapter, RawEvent } from "@/types/event";

const API_BASE = "https://www.eventbriteapi.com/v3";
const GOLD_COAST_LOCATION = "-28.0167,153.4000"; // lat,lon
const SEARCH_RADIUS = "50km";

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
 * Eventbrite API adapter for Gold Coast events.
 * Requires EVENTBRITE_API_KEY env var (OAuth private token).
 */
export class EventbriteAdapter implements SourceAdapter {
  readonly name = "eventbrite";

  async fetch(): Promise<RawEvent[]> {
    const token = process.env.EVENTBRITE_API_KEY;
    if (!token) {
      console.warn("[eventbrite] EVENTBRITE_API_KEY not set, skipping");
      return [];
    }

    const events: RawEvent[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const url = new URL(`${API_BASE}/events/search/`);
      url.searchParams.set("location.latitude", GOLD_COAST_LOCATION.split(",")[0]);
      url.searchParams.set("location.longitude", GOLD_COAST_LOCATION.split(",")[1]);
      url.searchParams.set("location.within", SEARCH_RADIUS);
      url.searchParams.set("expand", "venue,ticket_availability");
      url.searchParams.set("page", String(page));

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error(`[eventbrite] API error ${res.status}: ${await res.text()}`);
        break;
      }

      const data: EventbriteResponse = await res.json();

      for (const eb of data.events) {
        events.push(mapEvent(eb));
      }

      hasMore = data.pagination.has_more_items;
      page++;
    }

    return events;
  }
}

function mapEvent(eb: EventbriteEvent): RawEvent {
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
    city: eb.venue?.address?.city ?? "Gold Coast",
    state: eb.venue?.address?.region ?? "QLD",
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
