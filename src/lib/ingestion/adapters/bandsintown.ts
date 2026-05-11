import type { SourceAdapter, RawEvent } from "@/types/event";
import { AU_LOCATIONS } from "../au-locations";

const API_BASE = "https://rest.bandsintown.com";

/**
 * Bandsintown adapter for Australian music events.
 *
 * Bandsintown's REST API is no longer "public" — the unauthenticated
 * `app_id` path now returns `403 — User is not authorized to access this
 * resource with an explicit deny in an identity-based policy`. To produce
 * events we need a partner-issued app_id set as `BANDSINTOWN_APP_ID`.
 * Apply at https://artists.bandsintown.com/support/api-installation
 * (partner inquiries: api@bandsintown.com).
 *
 * Until that's configured the adapter is a no-op so it doesn't burn an
 * HTTP request per AU city on every nightly run.
 */

interface BitEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  title: string;
  description: string;
  artist: {
    id: string;
    name: string;
    url: string;
    image_url: string;
    thumb_url: string;
    tracker_count: number;
  };
  venue: {
    name: string;
    location: string;
    city: string;
    region: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
}

export class BandsintownAdapter implements SourceAdapter {
  readonly name = "bandsintown";

  async fetch(): Promise<RawEvent[]> {
    const appId = process.env.BANDSINTOWN_APP_ID;
    if (!appId) {
      console.warn("[bandsintown] BANDSINTOWN_APP_ID not set, skipping");
      return [];
    }

    const events: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of AU_LOCATIONS) {
      console.log(`[bandsintown] Fetching ${loc.name} (${loc.state})...`);
      try {
        const res = await fetch(
          `${API_BASE}/v4/events?location=${encodeURIComponent(loc.name)}, AU&radius=50&app_id=${encodeURIComponent(appId)}`,
          { headers: { Accept: "application/json" } }
        );

        if (res.ok) {
          const data: BitEvent[] = await res.json();
          if (Array.isArray(data)) {
            for (const evt of data) {
              if (!seen.has(evt.id)) {
                seen.add(evt.id);
                events.push(mapEvent(evt, loc));
              }
            }
          }
        } else {
          console.warn(`[bandsintown] Location search failed ${res.status} for ${loc.name}`);
        }
      } catch (err) {
        console.error(`[bandsintown] Location search error for ${loc.name}:`, err);
      }
    }

    return events;
  }
}

function mapEvent(evt: BitEvent, fallback: { name: string; state: string }): RawEvent {
  const ticketOffer = evt.offers?.find((o) => o.type === "Tickets" && o.status === "available");

  return {
    sourceId: evt.id,
    name: evt.title || `${evt.artist.name} Live`,
    description: evt.description || `${evt.lineup.join(", ")} live at ${evt.venue.name}`,
    startDate: new Date(evt.datetime),
    imageUrl: evt.artist.image_url || undefined,
    url: evt.url,
    venueName: evt.venue.name,
    venueAddress: evt.venue.location,
    city: evt.venue.city || fallback.name,
    state: evt.venue.region || fallback.state,
    latitude: evt.venue.latitude ? parseFloat(evt.venue.latitude) : undefined,
    longitude: evt.venue.longitude ? parseFloat(evt.venue.longitude) : undefined,
    category: "MUSIC",
    tags: evt.lineup,
    ticketUrl: ticketOffer?.url ?? evt.url,
    ticketProvider: "bandsintown",
    rawData: evt,
  };
}
