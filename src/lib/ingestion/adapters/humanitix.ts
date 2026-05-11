import type { SourceAdapter, RawEvent } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { AU_LOCATIONS } from "../au-locations";

const MAX_PAGES_PER_CITY = 80;
const PAGE_DELAY_MS = 200;
// `/api/carousels` returns events whose location falls inside the
// `northeast`/`southwest` box. A degree of latitude is ~111 km, so 1.0
// gives a ~100 km radius around each city centroid — wide enough that
// every page reliably returns a full carousel (smaller boxes thin out
// after the first page or two).
const BBOX_DEGREES = 1.0;

interface HumanitixEvent {
  _id: string;
  hostname?: string;
  name?: string;
  slug?: string;
  date?: { startDate?: string; endDate?: string };
  bannerImage?: { handle?: string };
  eventLocation?: {
    address?: string;
    venueName?: string;
    addressComponents?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  };
  pricing?: { minimumPrice?: number; maximumPrice?: number };
  timezone?: string;
  isRecurring?: boolean;
}

/**
 * Humanitix scraper adapter.
 *
 * Humanitix is a fully client-side Next.js app — the SSR location page only
 * embeds ~4 events in JSON-LD. The full event list is paginated through an
 * undocumented `POST /api/carousels` endpoint, which the site itself hits
 * once per scroll-page. We call it directly with a synthetic geocode payload
 * (slug + bounding box around the city's lat/lng) and walk pages until the
 * API stops returning new events.
 */
export class HumanitixAdapter implements SourceAdapter {
  readonly name = "humanitix";

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.HUMANITIX_URL ?? "https://humanitix.com";
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of AU_LOCATIONS) {
      const slug = locationSlug(loc.name, loc.state);
      const stateKey = slug;
      const geocode = {
        slug,
        countryCode: "au",
        name: loc.name,
        latLng: { lat: loc.lat, lng: loc.lon },
        northeast: { lat: loc.lat + BBOX_DEGREES, lng: loc.lon + BBOX_DEGREES },
        southwest: { lat: loc.lat - BBOX_DEGREES, lng: loc.lon - BBOX_DEGREES },
      };

      let page = 1;
      let cityAdded = 0;
      let cityRepeatPages = 0;

      while (page <= MAX_PAGES_PER_CITY) {
        let items: HumanitixEvent[];
        try {
          const res = await fetch(`${baseUrl}/api/carousels`, {
            method: "POST",
            headers: {
              "User-Agent": SCRAPER_USER_AGENT,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              geocode,
              parsedCategories: {},
              stateKey,
              page,
            }),
          });
          if (!res.ok) {
            console.error(
              `[humanitix] ${loc.name} page ${page}: HTTP ${res.status}`
            );
            break;
          }
          const json = await res.json();
          items = Array.isArray(json) ? (json as HumanitixEvent[]) : [];
        } catch (err) {
          console.error(`[humanitix] ${loc.name} page ${page} fetch failed:`, err);
          break;
        }

        if (items.length === 0) break;

        let newOnPage = 0;
        for (const it of items) {
          const ev = mapEvent(it, loc.name, loc.state);
          if (!ev) continue;
          if (seen.has(ev.sourceId)) continue;
          seen.add(ev.sourceId);
          allEvents.push(ev);
          cityAdded++;
          newOnPage++;
        }

        if (newOnPage === 0) {
          cityRepeatPages++;
          // Two consecutive all-duplicate pages -> we've cycled past fresh
          // results for this location.
          if (cityRepeatPages >= 2) break;
        } else {
          cityRepeatPages = 0;
        }

        page++;
        if (PAGE_DELAY_MS > 0) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
      }

      console.log(
        `[humanitix]   -> ${loc.name} (${loc.state}): +${cityAdded} (total=${allEvents.length})`
      );
    }

    return allEvents;
  }
}

function locationSlug(city: string, state: string): string {
  const citySlug = city.toLowerCase().trim().replace(/\s+/g, "-");
  return `au--${state.toLowerCase()}--${citySlug}`;
}

function mapEvent(
  it: HumanitixEvent,
  fallbackCity: string,
  fallbackState: string
): RawEvent | null {
  if (!it._id || !it.name) return null;

  const startRaw = it.date?.startDate;
  const start = startRaw ? new Date(startRaw) : null;
  if (!start || Number.isNaN(start.getTime())) return null;

  const endRaw = it.date?.endDate;
  const end = endRaw ? new Date(endRaw) : undefined;
  const eventUrl = it.slug
    ? `${it.hostname ?? "https://events.humanitix.com/"}${it.slug}`
    : undefined;
  const imageUrl = it.bannerImage?.handle
    ? `https://images.humanitix.com/i/${it.bannerImage.handle}@seo-1200.jpg`
    : undefined;

  const components = it.eventLocation?.addressComponents ?? [];
  const localityComp = components.find((c) => c.types?.includes("locality"));
  const regionComp = components.find((c) =>
    c.types?.includes("administrative_area_level_1")
  );

  return {
    sourceId: it._id,
    name: it.name,
    startDate: start,
    endDate: end && !Number.isNaN(end.getTime()) ? end : undefined,
    imageUrl,
    url: eventUrl,
    venueName: it.eventLocation?.venueName ?? undefined,
    venueAddress: it.eventLocation?.address ?? undefined,
    city: localityComp?.long_name ?? fallbackCity,
    state: regionComp?.short_name ?? fallbackState,
    category: "COMMUNITY",
    isFree: it.pricing?.minimumPrice === 0 && it.pricing?.maximumPrice === 0,
    priceMin:
      typeof it.pricing?.minimumPrice === "number"
        ? it.pricing.minimumPrice
        : undefined,
    priceMax:
      typeof it.pricing?.maximumPrice === "number"
        ? it.pricing.maximumPrice
        : undefined,
    ticketUrl: eventUrl,
    ticketProvider: "humanitix",
    rawData: it,
  };
}
