import type { SourceAdapter, RawEvent } from "@/types/event";

const API_BASE = "https://app.ticketmaster.com/discovery/v2";
const PAGE_SIZE = 200;
const REQUEST_DELAY_MS = 250;

// Discovery API hard limit: (page+1)*size <= 1000. With size=200, max 5 pages.
const MAX_PAGES_PER_SLICE = 5;
const DEEP_PAGING_LIMIT = 1000;

// Classification segments we slice the country-wide search by.
// Querying per-segment keeps each slice under the 1000-result deep-paging cap.
const SEGMENTS = ["Music", "Sports", "Arts & Theatre", "Film", "Miscellaneous"] as const;

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
  page: { number: number; totalPages: number; totalElements: number; size: number };
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
 *
 * Queries countryCode=AU sliced by classification segment to stay under the
 * API's 1000-result deep-paging cap. If any segment still exceeds the cap,
 * it is sliced further by monthly date windows.
 *
 * Requires TICKETMASTER_API_KEY env var (consumer key).
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

    for (const segment of SEGMENTS) {
      const count = await this.fetchSegment(apiKey, segment, allEvents, seen);
      console.log(`[ticketmaster] Segment "${segment}": ${count} event(s)`);
    }

    console.log(`[ticketmaster] Total unique events: ${allEvents.length}`);
    return allEvents;
  }

  private async fetchSegment(
    apiKey: string,
    segment: string,
    allEvents: RawEvent[],
    seen: Set<string>
  ): Promise<number> {
    // First probe: page 0, no date window — learn totalElements.
    const probe = await this.fetchPage(apiKey, { segment, page: 0 });
    if (!probe) return 0;

    const totalElements = probe.page.totalElements ?? 0;
    let added = collect(probe._embedded?.events, allEvents, seen);

    if (totalElements <= DEEP_PAGING_LIMIT) {
      // Single window covers the segment; just walk remaining pages.
      const totalPages = Math.min(probe.page.totalPages, MAX_PAGES_PER_SLICE);
      for (let page = 1; page < totalPages; page++) {
        await delay(REQUEST_DELAY_MS);
        const res = await this.fetchPage(apiKey, { segment, page });
        if (!res) break;
        added += collect(res._embedded?.events, allEvents, seen);
      }
      return added;
    }

    // Segment exceeds deep-paging cap: slice by month from now → +18 months.
    console.log(
      `[ticketmaster] Segment "${segment}" has ${totalElements} events > ${DEEP_PAGING_LIMIT}, slicing by month`
    );
    const windows = monthlyWindows(18);
    for (const [startDateTime, endDateTime] of windows) {
      await delay(REQUEST_DELAY_MS);
      const first = await this.fetchPage(apiKey, {
        segment,
        page: 0,
        startDateTime,
        endDateTime,
      });
      if (!first) continue;
      added += collect(first._embedded?.events, allEvents, seen);

      const sliceTotal = first.page.totalElements ?? 0;
      if (sliceTotal > DEEP_PAGING_LIMIT) {
        console.warn(
          `[ticketmaster] Slice ${startDateTime.slice(0, 10)}..${endDateTime.slice(0, 10)} for "${segment}" has ${sliceTotal} events; only first ${DEEP_PAGING_LIMIT} reachable`
        );
      }
      const slicePages = Math.min(first.page.totalPages, MAX_PAGES_PER_SLICE);
      for (let page = 1; page < slicePages; page++) {
        await delay(REQUEST_DELAY_MS);
        const res = await this.fetchPage(apiKey, {
          segment,
          page,
          startDateTime,
          endDateTime,
        });
        if (!res) break;
        added += collect(res._embedded?.events, allEvents, seen);
      }
    }
    return added;
  }

  private async fetchPage(
    apiKey: string,
    opts: { segment: string; page: number; startDateTime?: string; endDateTime?: string }
  ): Promise<TmResponse | null> {
    const url = new URL(`${API_BASE}/events.json`);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("countryCode", "AU");
    url.searchParams.set("classificationName", opts.segment);
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("page", String(opts.page));
    url.searchParams.set("sort", "date,asc");
    if (opts.startDateTime) url.searchParams.set("startDateTime", opts.startDateTime);
    if (opts.endDateTime) url.searchParams.set("endDateTime", opts.endDateTime);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(
        `[ticketmaster] API error ${res.status} segment="${opts.segment}" page=${opts.page}: ${await res.text()}`
      );
      return null;
    }
    return (await res.json()) as TmResponse;
  }
}

function collect(events: TmEvent[] | undefined, out: RawEvent[], seen: Set<string>): number {
  if (!events) return 0;
  let added = 0;
  for (const tm of events) {
    if (seen.has(tm.id)) continue;
    seen.add(tm.id);
    out.push(mapEvent(tm));
    added++;
  }
  return added;
}

function mapEvent(tm: TmEvent): RawEvent {
  const venue = tm._embedded?.venues?.[0];
  const bestImage = tm.images?.sort((a, b) => b.width - a.width)?.[0];
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
    endDate: tm.dates.end?.dateTime ? new Date(tm.dates.end.dateTime) : undefined,
    imageUrl: bestImage?.url ?? undefined,
    url: tm.url,
    venueName: venue?.name ?? undefined,
    venueAddress: venue?.address?.line1 ?? undefined,
    city: venue?.city?.name ?? undefined,
    state: venue?.state?.stateCode ?? undefined,
    latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
    longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
    category: SEGMENT_MAP[segment ?? ""] ?? "OTHER",
    isFree: priceRange ? priceRange.min === 0 : false,
    priceMin: priceRange?.min ?? undefined,
    priceMax: priceRange?.max ?? undefined,
    ticketUrl: tm.url,
    rawData: tm,
  };
}

function monthlyWindows(months: number): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < months; i++) {
    const from = new Date(start);
    from.setUTCMonth(from.getUTCMonth() + i);
    const to = new Date(start);
    to.setUTCMonth(to.getUTCMonth() + i + 1);
    out.push([toIsoZ(from), toIsoZ(to)]);
  }
  return out;
}

function toIsoZ(d: Date): string {
  // Ticketmaster requires `yyyy-MM-dd'T'HH:mm:ss'Z'` (no millis).
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
