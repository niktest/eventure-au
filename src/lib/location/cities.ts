/**
 * Single source of truth for supported cities. Used by:
 *   - Middleware IP→city detection (`detectCityFromHeaders`)
 *   - Server pages reading the city cookie (home, /events, /city/[slug])
 *   - Client city picker + "Near Me" geolocation snap
 *
 * EVE-209: keep this file the only place new cities are added.
 */

export type CityStatus = "live" | "coming-soon";

export type SupportedCity = {
  slug: string;
  label: string;
  state: string;
  /** Centre lat/lng — used as a "snap" target for IP/geolocation detection. */
  lat: number;
  lng: number;
  /** Status of the city — `coming-soon` is shown disabled in pickers. */
  status: CityStatus;
  /**
   * Lowercase substrings that may appear in `x-vercel-ip-city` for this
   * region. Vercel's reported city can be a nearby suburb, so we match
   * a small alias list rather than exact equality.
   */
  ipAliases: string[];
};

export const SUPPORTED_CITIES: SupportedCity[] = [
  {
    slug: "gold-coast",
    label: "Gold Coast",
    state: "QLD",
    lat: -28.0167,
    lng: 153.4,
    status: "live",
    ipAliases: [
      "gold coast",
      "southport",
      "surfers paradise",
      "broadbeach",
      "burleigh",
      "coolangatta",
      "robina",
      "nerang",
    ],
  },
  {
    slug: "brisbane",
    label: "Brisbane",
    state: "QLD",
    lat: -27.4698,
    lng: 153.0251,
    status: "live",
    ipAliases: ["brisbane", "south brisbane", "fortitude valley", "spring hill"],
  },
  {
    slug: "sydney",
    label: "Sydney",
    state: "NSW",
    lat: -33.8688,
    lng: 151.2093,
    status: "coming-soon",
    ipAliases: ["sydney", "parramatta", "manly", "bondi"],
  },
  {
    slug: "melbourne",
    label: "Melbourne",
    state: "VIC",
    lat: -37.8136,
    lng: 144.9631,
    status: "coming-soon",
    ipAliases: ["melbourne", "south yarra", "fitzroy", "st kilda"],
  },
];

export const DEFAULT_CITY_SLUG = "gold-coast";

export function findCityBySlug(slug: string | null | undefined): SupportedCity | null {
  if (!slug) return null;
  return SUPPORTED_CITIES.find((c) => c.slug === slug) ?? null;
}

export function findCityByLabel(label: string | null | undefined): SupportedCity | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  return SUPPORTED_CITIES.find((c) => c.label.toLowerCase() === lower) ?? null;
}

/** Squared Euclidean distance — fine for ranking, no need for haversine. */
function squaredDist(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

export function nearestCity(lat: number, lng: number): SupportedCity {
  let best = SUPPORTED_CITIES[0]!;
  let bestDist = Infinity;
  for (const c of SUPPORTED_CITIES) {
    const d = squaredDist(c.lat, c.lng, lat, lng);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}
