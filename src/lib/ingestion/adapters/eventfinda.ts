import type { SourceAdapter, RawEvent, EventCategory } from "@/types/event";

const API_BASE = "https://api.eventfinda.com.au/v2";

// Gold Coast & Brisbane locations for initial MVP
const LOCATIONS = [
  { name: "Gold Coast", lat: -28.0167, lon: 153.4 },
  { name: "Brisbane", lat: -27.4705, lon: 153.026 },
];
const SEARCH_RADIUS = 50; // km

interface EventfindaEvent {
  id: number;
  name: string;
  description: string;
  url: string;
  url_slug: string;
  datetime_start: string;
  datetime_end: string;
  datetime_summary: string;
  is_free: boolean;
  is_cancelled: boolean;
  address: string;
  location_summary: string;
  point: { lat: number; lng: number } | null;
  location: { name: string; summary: string } | null;
  category: { id: number; name: string } | null;
  images: { images: Array<{ id: number; transforms: { transforms: Array<{ url: string; width: number; height: number }> } }> } | null;
  ticket_types: { ticket_types: Array<{ name: string; price: string; is_free: boolean }> } | null;
  restrictions: string | null;
  presented_by: string | null;
}

interface EventfindaResponse {
  events: EventfindaEvent[];
  "@attributes": { count: number; rows: number; page: number; page_count: number };
}

const CATEGORY_MAP: Record<string, EventCategory> = {
  "concerts-gig-guide": "MUSIC",
  "festivals": "FESTIVAL",
  "markets": "MARKETS",
  "sports": "SPORTS",
  "family": "FAMILY",
  "nightlife": "NIGHTLIFE",
  "food-wine": "FOOD_DRINK",
  "art": "ARTS",
  "comedy": "COMEDY",
  "theatre": "THEATRE",
  "outdoors": "OUTDOOR",
  "community": "COMMUNITY",
};

function mapCategory(cat: { id: number; name: string } | null): EventCategory | undefined {
  if (!cat) return undefined;
  const name = cat.name.toLowerCase().replace(/\s+/g, "-");
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (name.includes(key)) return value;
  }
  return undefined;
}

/**
 * Eventfinda AU API adapter.
 * Uses the Eventfinda REST API v2 to fetch events near Gold Coast and Brisbane.
 * Requires EVENTFINDA_USERNAME and EVENTFINDA_PASSWORD env vars (HTTP Basic auth).
 * Free signup at https://www.eventfinda.com.au/api/v2/index
 */
export class EventfindaAdapter implements SourceAdapter {
  readonly name = "eventfinda";

  async fetch(): Promise<RawEvent[]> {
    const username = process.env.EVENTFINDA_USERNAME;
    const password = process.env.EVENTFINDA_PASSWORD;
    if (!username || !password) {
      console.warn("[eventfinda] EVENTFINDA_USERNAME/EVENTFINDA_PASSWORD not set, skipping");
      return [];
    }

    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    const events: RawEvent[] = [];

    for (const loc of LOCATIONS) {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) {
        const url = new URL(`${API_BASE}/events.json`);
        url.searchParams.set("point", `${loc.lat},${loc.lon}`);
        url.searchParams.set("radius", String(SEARCH_RADIUS));
        url.searchParams.set("rows", "20");
        url.searchParams.set("page", String(page));
        url.searchParams.set("order", "date");
        url.searchParams.set("fields", "event:(id,name,description,url,url_slug,datetime_start,datetime_end,datetime_summary,is_free,is_cancelled,address,location_summary,point,location,category,images,ticket_types,restrictions,presented_by)");

        console.log(`[eventfinda] Fetching ${loc.name} page ${page}`);

        try {
          const res = await fetch(url.toString(), {
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            console.error(`[eventfinda] API error ${res.status}: ${await res.text()}`);
            break;
          }

          const data: EventfindaResponse = await res.json();
          const attrs = data["@attributes"];

          for (const ef of data.events) {
            if (ef.is_cancelled) continue;
            events.push(mapEvent(ef, loc.name));
          }

          hasMore = page < attrs.page_count;
          page++;

          // Respect rate limit: 1 req/sec
          await new Promise((r) => setTimeout(r, 1100));
        } catch (err) {
          console.error(`[eventfinda] Fetch failed for ${loc.name}:`, err);
          break;
        }
      }
    }

    return events;
  }
}

function mapEvent(ef: EventfindaEvent, fallbackCity: string): RawEvent {
  const bestImage = ef.images?.images?.[0]?.transforms?.transforms
    ?.sort((a, b) => b.width - a.width)?.[0]?.url;

  const tickets = ef.ticket_types?.ticket_types ?? [];
  const prices = tickets
    .map((t) => parseFloat(t.price))
    .filter((p) => !isNaN(p) && p > 0);

  return {
    sourceId: String(ef.id),
    name: ef.name,
    description: ef.description ?? undefined,
    startDate: ef.datetime_start,
    endDate: ef.datetime_end ?? undefined,
    imageUrl: bestImage ?? undefined,
    url: ef.url,
    venueName: ef.location?.name ?? undefined,
    venueAddress: ef.address ?? undefined,
    city: ef.location_summary?.split(",")[0]?.trim() || fallbackCity,
    state: "QLD",
    latitude: ef.point?.lat ?? undefined,
    longitude: ef.point?.lng ?? undefined,
    category: mapCategory(ef.category),
    isFree: ef.is_free,
    priceMin: prices.length > 0 ? Math.min(...prices) : undefined,
    priceMax: prices.length > 0 ? Math.max(...prices) : undefined,
    ticketUrl: ef.url,
    ticketProvider: "eventfinda",
    rawData: ef,
  };
}
