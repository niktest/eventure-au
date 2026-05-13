import type { SourceAdapter, RawEvent, EventCategory } from "@/types/event";
import { AU_LOCATIONS, AU_SEARCH_RADIUS_KM } from "../au-locations";

const API_BASE = "https://api.eventfinda.com.au/v2";

interface EventfindaSession {
  datetime_start: string;
  datetime_end?: string | null;
  is_cancelled?: boolean;
}

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
  sessions: { sessions: EventfindaSession[] } | null;
  restrictions: string | null;
  presented_by: string | null;
}

// Anything within the last 24h is treated as still live, so an event in
// progress isn't dropped. Eventfinda's top-level `datetime_start` for a
// recurring series points at the first occurrence and `datetime_end` at the
// last, so without inspecting sessions a year-long recurring series looks
// like "started Sep 2025, ends Oct 2026" and the start is wildly stale.
const STALE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

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

/** Map state abbreviation from location_summary or fallback */
function extractState(locationSummary: string | undefined, fallbackState: string): string {
  if (!locationSummary) return fallbackState;
  const parts = locationSummary.split(",").map((s) => s.trim());
  const statePart = parts[parts.length - 1]?.toUpperCase();
  const validStates = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"];
  if (validStates.includes(statePart)) return statePart;
  return fallbackState;
}

/**
 * Eventfinda AU API adapter.
 * Searches all major Australian cities via the Eventfinda REST API v2.
 * Requires EVENTFINDA_USERNAME and EVENTFINDA_PASSWORD env vars (HTTP Basic auth).
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
    const seen = new Set<number>();

    // Safety cap per city. With rows=100 this is up to 1000 events/city.
    // Eventfinda rate-limit is 1 req/s so we stay under ~3 min worst case.
    const MAX_PAGES_PER_CITY = 10;
    const ROWS_PER_PAGE = 100;

    for (const loc of AU_LOCATIONS) {
      let page = 1;
      let hasMore = true;
      let cityCount = 0;

      while (hasMore && page <= MAX_PAGES_PER_CITY) {
        const url = new URL(`${API_BASE}/events.json`);
        url.searchParams.set("point", `${loc.lat},${loc.lon}`);
        url.searchParams.set("radius", String(AU_SEARCH_RADIUS_KM));
        url.searchParams.set("rows", String(ROWS_PER_PAGE));
        url.searchParams.set("page", String(page));
        url.searchParams.set("order", "date");
        // `sessions` (bare) returns the full session sub-resource. The
        // nested `sessions:(session:(...))` syntax silently returns no
        // sessions, which we discovered the hard way (EVE-203).
        url.searchParams.set("fields", "event:(id,name,description,url,url_slug,datetime_start,datetime_end,datetime_summary,is_free,is_cancelled,address,location_summary,point,location,category,images,ticket_types,sessions,restrictions,presented_by)");

        console.log(`[eventfinda] Fetching ${loc.name} (${loc.state}) page ${page}`);

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

          const now = new Date();
          for (const ef of data.events) {
            if (ef.is_cancelled) continue;
            if (seen.has(ef.id)) continue;
            const mapped = mapEvent(ef, loc.name, loc.state, now);
            if (!mapped) continue;
            seen.add(ef.id);
            events.push(mapped);
            cityCount++;
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
      console.log(`[eventfinda]   -> ${loc.name}: +${cityCount} (total=${events.length})`);
    }

    return events;
  }
}

/**
 * Pick the start/end pair we should ship for this event.
 *
 * Eventfinda's top-level `datetime_start` for a recurring series points at
 * the first occurrence and `datetime_end` at the last, so without inspecting
 * `sessions` a weekly event that started last September looks like it ran in
 * 2025 even though the next session is next week.
 *
 * Returns the soonest future (non-cancelled) session when sessions are
 * present, otherwise the top-level dates. Returns `null` when the event has
 * fully run out — its only anchor is more than `STALE_TOLERANCE_MS` in the
 * past and no `datetime_end` keeps it live.
 */
export function pickEventfindaStart(
  ef: Pick<EventfindaEvent, "datetime_start" | "datetime_end" | "sessions">,
  now: Date
): { start: string; end?: string } | null {
  const cutoff = now.getTime() - STALE_TOLERANCE_MS;

  const sessions = (ef.sessions?.sessions ?? [])
    .filter((s) => !s.is_cancelled)
    .map((s) => ({
      start: s.datetime_start,
      end: s.datetime_end ?? undefined,
      startMs: parseEventfindaTimestamp(s.datetime_start),
    }))
    .filter((s) => Number.isFinite(s.startMs))
    .sort((a, b) => a.startMs - b.startMs);

  const upcoming = sessions.find((s) => s.startMs >= cutoff);
  if (upcoming) return { start: upcoming.start, end: upcoming.end };

  // Sessions exist but every one is stale → the event has run out.
  if (sessions.length > 0) return null;

  const topStartMs = parseEventfindaTimestamp(ef.datetime_start);
  if (!Number.isFinite(topStartMs)) return null;
  if (topStartMs >= cutoff) {
    return { start: ef.datetime_start, end: ef.datetime_end ?? undefined };
  }
  // Top-level start is stale but the event may still be running.
  const endMs = ef.datetime_end
    ? parseEventfindaTimestamp(ef.datetime_end)
    : NaN;
  if (Number.isFinite(endMs) && endMs >= cutoff) {
    return { start: ef.datetime_start, end: ef.datetime_end ?? undefined };
  }
  return null;
}

/**
 * Eventfinda returns timestamps as `"YYYY-MM-DD HH:MM:SS"` (no T, no zone) in
 * some responses and ISO-8601 with offset in others. The relative comparison
 * is all that matters here, so accept either.
 */
function parseEventfindaTimestamp(value: string): number {
  if (!value) return NaN;
  const normalised = value.includes("T") ? value : value.replace(" ", "T");
  return new Date(normalised).getTime();
}

function mapEvent(
  ef: EventfindaEvent,
  fallbackCity: string,
  fallbackState: string,
  now: Date
): RawEvent | null {
  const chosen = pickEventfindaStart(ef, now);
  if (!chosen) return null;

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
    startDate: chosen.start,
    endDate: chosen.end ?? undefined,
    imageUrl: bestImage ?? undefined,
    url: ef.url,
    venueName: ef.location?.name ?? undefined,
    venueAddress: ef.address ?? undefined,
    city: ef.location_summary?.split(",")[0]?.trim() || fallbackCity,
    state: extractState(ef.location_summary, fallbackState),
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
