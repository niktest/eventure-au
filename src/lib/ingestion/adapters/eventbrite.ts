import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { upgradeEventbriteImage } from "../utils/scrape-helpers";

/**
 * Eventbrite public-page scraper.
 *
 * The v3 `/events/search/` endpoint was deprecated for standard private
 * tokens (see EVE-189), so this adapter scrapes the public city listing
 * pages at `eventbrite.com.au/d/australia--{slug}/events/` and parses the
 * embedded JSON-LD `ItemList` payload. Walks `?page=N` until a page adds no
 * new events, mirroring the per-city pagination pattern in EVE-186.
 * Sibling style: Humanitix / Megatix / Oztix / Trybooking.
 */

const MAX_PAGES_PER_CITY = 20;

/** Eventbrite city slugs used in `/d/australia--{slug}/events/`. */
const EVENTBRITE_LOCATIONS = [
  { slug: "brisbane", city: "Brisbane", state: "QLD" },
  { slug: "gold-coast", city: "Gold Coast", state: "QLD" },
  { slug: "sunshine-coast", city: "Sunshine Coast", state: "QLD" },
  { slug: "cairns", city: "Cairns", state: "QLD" },
  { slug: "townsville", city: "Townsville", state: "QLD" },
  { slug: "toowoomba", city: "Toowoomba", state: "QLD" },
  { slug: "sydney", city: "Sydney", state: "NSW" },
  { slug: "newcastle", city: "Newcastle", state: "NSW" },
  { slug: "wollongong", city: "Wollongong", state: "NSW" },
  { slug: "byron-bay", city: "Byron Bay", state: "NSW" },
  { slug: "melbourne", city: "Melbourne", state: "VIC" },
  { slug: "geelong", city: "Geelong", state: "VIC" },
  { slug: "ballarat", city: "Ballarat", state: "VIC" },
  { slug: "adelaide", city: "Adelaide", state: "SA" },
  { slug: "perth", city: "Perth", state: "WA" },
  { slug: "fremantle", city: "Fremantle", state: "WA" },
  { slug: "hobart", city: "Hobart", state: "TAS" },
  { slug: "canberra", city: "Canberra", state: "ACT" },
  { slug: "darwin", city: "Darwin", state: "NT" },
];

interface JsonLdAddress {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
}

interface JsonLdGeo {
  latitude?: string;
  longitude?: string;
}

interface JsonLdLocation {
  name?: string;
  address?: JsonLdAddress | string;
  geo?: JsonLdGeo;
}

interface JsonLdEvent {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  image?: string | string[];
  url?: string;
  location?: JsonLdLocation;
  isAccessibleForFree?: boolean;
  offers?: { lowPrice?: string | number; highPrice?: string | number; url?: string };
}

interface JsonLdItemList {
  "@type"?: string;
  itemListElement?: Array<{ item?: JsonLdEvent }>;
}

export class EventbriteAdapter implements SourceAdapter {
  readonly name = "eventbrite";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.EVENTBRITE_URL ?? "https://www.eventbrite.com.au";
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of EVENTBRITE_LOCATIONS) {
      let cityAdded = 0;
      let page = 1;

      while (page <= MAX_PAGES_PER_CITY) {
        const searchUrl =
          page === 1
            ? `${baseUrl}/d/australia--${loc.slug}/events/`
            : `${baseUrl}/d/australia--${loc.slug}/events/?page=${page}`;

        let html: string;
        try {
          const res = await fetch(searchUrl, {
            headers: {
              "User-Agent": SCRAPER_USER_AGENT,
              Accept: "text/html,application/xhtml+xml",
            },
            redirect: "follow",
          });

          if (!res.ok) {
            console.error(
              `[eventbrite] ${loc.city} page ${page}: HTTP ${res.status}`
            );
            break;
          }

          html = await res.text();
        } catch (err) {
          console.error(`[eventbrite] ${loc.city} page ${page} fetch failed:`, err);
          break;
        }

        const parsed = parseEventbriteEvents(html, loc.city, loc.state);
        let pageNew = 0;
        for (const evt of parsed) {
          if (seen.has(evt.sourceId)) continue;
          seen.add(evt.sourceId);
          allEvents.push(evt);
          pageNew++;
        }

        // Stop when a page returns no events, or returns only duplicates of
        // earlier pages. Eventbrite cycles back to page 1 once it runs out.
        if (parsed.length === 0 || pageNew === 0) break;

        cityAdded += pageNew;
        page++;
      }

      console.log(
        `[eventbrite]   -> ${loc.city} (${loc.state}): +${cityAdded} (total=${allEvents.length})`
      );
    }

    return allEvents;
  }
}

function isEventType(type: JsonLdEvent["@type"]): boolean {
  if (!type) return false;
  if (typeof type === "string") return type === "Event" || type.endsWith("Event");
  return type.some((t) => t === "Event" || (typeof t === "string" && t.endsWith("Event")));
}

export function parseEventbriteEvents(
  html: string,
  fallbackCity: string,
  fallbackState: string
): RawEvent[] {
  const events: RawEvent[] = [];
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }

    const items = collectEventNodes(data);
    for (const item of items) {
      const evt = mapJsonLdEvent(item, fallbackCity, fallbackState);
      if (evt) events.push(evt);
    }
  }

  return events;
}

function collectEventNodes(data: unknown): JsonLdEvent[] {
  const out: JsonLdEvent[] = [];
  const walk = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as JsonLdEvent & JsonLdItemList;
    if (isEventType(obj["@type"])) {
      out.push(obj);
      return;
    }
    if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
      for (const entry of obj.itemListElement) {
        if (entry?.item) walk(entry.item);
      }
    }
  };
  walk(data);
  return out;
}

function mapJsonLdEvent(
  item: JsonLdEvent,
  fallbackCity: string,
  fallbackState: string
): RawEvent | null {
  if (!item.name || !item.startDate) return null;

  const address = typeof item.location?.address === "object" ? item.location.address : undefined;
  const venueAddress =
    typeof item.location?.address === "string"
      ? item.location.address
      : address?.streetAddress;

  const rawImage = typeof item.image === "string" ? item.image : item.image?.[0];
  const imageUrl = upgradeEventbriteImage(rawImage);

  const lowPrice = toNumber(item.offers?.lowPrice);
  const highPrice = toNumber(item.offers?.highPrice);

  const sourceId =
    item.url ?? `eventbrite-${item.name.replace(/\s+/g, "-").toLowerCase()}`;

  return {
    sourceId,
    name: item.name,
    description: item.description,
    startDate: new Date(item.startDate),
    endDate: item.endDate ? new Date(item.endDate) : undefined,
    imageUrl,
    url: item.url,
    venueName: item.location?.name,
    venueAddress,
    city: address?.addressLocality ?? fallbackCity,
    state: address?.addressRegion ?? fallbackState,
    latitude: toNumber(item.location?.geo?.latitude),
    longitude: toNumber(item.location?.geo?.longitude),
    isFree: item.isAccessibleForFree === true,
    priceMin: lowPrice,
    priceMax: highPrice,
    ticketUrl: item.offers?.url ?? item.url,
    ticketProvider: "eventbrite",
    rawData: item,
  };
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : undefined;
}
