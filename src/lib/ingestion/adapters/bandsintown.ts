import type { SourceAdapter, RawEvent } from "@/types/event";

const API_BASE = "https://rest.bandsintown.com";
const APP_ID = "eventure"; // Public app_id for Bandsintown API v3

/**
 * Bandsintown adapter for Gold Coast music events.
 * Uses the public events API — no API key needed (app_id only).
 * Fetches events for popular Gold Coast venues.
 */

const GOLD_COAST_VENUES = [
  "HOTA",
  "The Star Gold Coast",
  "Miami Marketta",
  "Sandstone Point Hotel",
  "Coolangatta Hotel",
  "Elsewhere Bar",
  "NightQuarter",
  "Surfers Paradise",
];

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
    const events: RawEvent[] = [];
    const seen = new Set<string>();

    // Search by popular Gold Coast artists/venues via location search
    try {
      const res = await fetch(
        `${API_BASE}/v4/events?location=Gold Coast, AU&radius=50&app_id=${APP_ID}`,
        { headers: { Accept: "application/json" } }
      );

      if (res.ok) {
        const data: BitEvent[] = await res.json();
        if (Array.isArray(data)) {
          for (const evt of data) {
            if (!seen.has(evt.id)) {
              seen.add(evt.id);
              events.push(mapEvent(evt));
            }
          }
        }
      } else {
        console.warn(`[bandsintown] Location search failed ${res.status}`);
      }
    } catch (err) {
      console.error("[bandsintown] Location search error:", err);
    }

    // Also try venue-based lookups for key GC venues
    for (const venueName of GOLD_COAST_VENUES) {
      try {
        const res = await fetch(
          `${API_BASE}/v4/venues/search?query=${encodeURIComponent(venueName)}&location=Gold Coast, AU&app_id=${APP_ID}`,
          { headers: { Accept: "application/json" } }
        );

        if (!res.ok) continue;

        const venues = await res.json();
        if (!Array.isArray(venues) || venues.length === 0) continue;

        const venueId = venues[0].id;
        const eventsRes = await fetch(
          `${API_BASE}/v4/venues/${venueId}/events?app_id=${APP_ID}`,
          { headers: { Accept: "application/json" } }
        );

        if (!eventsRes.ok) continue;

        const venueEvents: BitEvent[] = await eventsRes.json();
        if (Array.isArray(venueEvents)) {
          for (const evt of venueEvents) {
            if (!seen.has(evt.id)) {
              seen.add(evt.id);
              events.push(mapEvent(evt));
            }
          }
        }
      } catch {
        // Individual venue lookup failure — continue with others
      }
    }

    return events;
  }
}

function mapEvent(evt: BitEvent): RawEvent {
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
    city: evt.venue.city || "Gold Coast",
    state: evt.venue.region || "QLD",
    latitude: evt.venue.latitude ? parseFloat(evt.venue.latitude) : undefined,
    longitude: evt.venue.longitude ? parseFloat(evt.venue.longitude) : undefined,
    category: "MUSIC",
    tags: evt.lineup,
    ticketUrl: ticketOffer?.url ?? evt.url,
    ticketProvider: "bandsintown",
    rawData: evt,
  };
}
