/**
 * Pure helpers for the `/events` URL query contract introduced in EVE-230:
 *   - `?when=today|tomorrow`     — Brisbane-local day window
 *   - `?category=foo,bar,baz`    — multi-select category slugs
 *   - `?near_me=1&lat&lng&max_radius_m` — coarse radius filter via Haversine
 *
 * Everything in here is intentionally stateless and import-light so server
 * components and unit tests can share it.
 */

import { HOMEPAGE_CATEGORIES } from "@/lib/categories";

/** Brisbane is fixed UTC+10 (Queensland does not observe DST). */
const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type WhenValue = "today" | "tomorrow";

export function isWhenValue(value: string | undefined | null): value is WhenValue {
  return value === "today" || value === "tomorrow";
}

export type DayWindow = { start: Date; end: Date };

/**
 * Resolve `?when=today|tomorrow` to a Brisbane-local 24h UTC window.
 * Today/Tomorrow use venue-local time per the EVE-226 wireframes — Brisbane
 * is the v1 anchor city (matches /today page semantics).
 */
export function resolveWhenWindow(
  when: string | undefined | null,
  now: Date = new Date(),
): DayWindow | null {
  if (!isWhenValue(when)) return null;
  const brisNow = new Date(now.getTime() + BRISBANE_OFFSET_MS);
  const y = brisNow.getUTCFullYear();
  const m = brisNow.getUTCMonth();
  const d = brisNow.getUTCDate() + (when === "tomorrow" ? 1 : 0);
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - BRISBANE_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

const VALID_CATEGORY_SLUGS: ReadonlySet<string> = new Set(
  HOMEPAGE_CATEGORIES.map((c) => c.slug).filter((s) => s !== "free"),
);

/**
 * Parse a multi-select category param. Accepts a single slug (`live-music`),
 * comma-separated slugs (`live-music,markets,arts`), or `null`/empty.
 * Only slugs in the EVE-215 taxonomy are returned; unknown slugs (and the
 * Free pseudo-category) are dropped silently so deep links never 500.
 * Order is preserved, duplicates collapsed.
 */
export function parseCategorySlugs(value: string | undefined | null): string[] {
  if (!value) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const slug = part.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    if (!VALID_CATEGORY_SLUGS.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/** Serialize the multi-select category set back into URL form. */
export function serializeCategorySlugs(slugs: readonly string[]): string {
  return slugs.join(",");
}

const DEFAULT_RADIUS_M = 25_000;
const MIN_RADIUS_M = 500;
const MAX_RADIUS_M = 200_000;

/**
 * Parse `?max_radius_m=` to an integer in metres, clamped to [500, 200000].
 * Returns null for missing/invalid input so callers can fall back to the
 * default radius without conflating "absent" and "zero".
 */
export function parseRadiusMeters(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < MIN_RADIUS_M) return MIN_RADIUS_M;
  if (rounded > MAX_RADIUS_M) return MAX_RADIUS_M;
  return rounded;
}

export const NEAR_ME_DEFAULT_RADIUS_M = DEFAULT_RADIUS_M;

/**
 * Parse a `lat` or `lng` query value to a finite number in the WGS84 range.
 * Returns null on missing/invalid/out-of-range input.
 */
export function parseLatLng(
  value: string | undefined | null,
  axis: "lat" | "lng",
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const bound = axis === "lat" ? 90 : 180;
  if (n < -bound || n > bound) return null;
  return n;
}

export type NearMeQuery = {
  lat: number;
  lng: number;
  /** Radius in metres, clamped. */
  radiusM: number;
};

/**
 * Resolve `?near_me=1&lat=&lng=&max_radius_m=` into a NearMeQuery, or `null`
 * if the flag is off or the coordinates are missing/invalid. We require an
 * explicit lat/lng pair so SSR is self-contained and ISR-safe (no cookies).
 */
export function resolveNearMeQuery(params: {
  near_me?: string;
  lat?: string;
  lng?: string;
  max_radius_m?: string;
}): NearMeQuery | null {
  if (params.near_me !== "1") return null;
  const lat = parseLatLng(params.lat, "lat");
  const lng = parseLatLng(params.lng, "lng");
  if (lat === null || lng === null) return null;
  const radius = parseRadiusMeters(params.max_radius_m) ?? DEFAULT_RADIUS_M;
  return { lat, lng, radiusM: radius };
}

/**
 * Great-circle distance in metres between two points on Earth.
 * R = 6,371,000 m. Accurate enough for "show me events within 25 km" — the
 * spheroid-vs-sphere error is well under 0.5% over those distances.
 */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sLat1 = Math.sin(dLat / 2);
  const sLng1 = Math.sin(dLng / 2);
  const h =
    sLat1 * sLat1 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sLng1 * sLng1;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Bounding-box prefilter. Returns the lat/lng range that strictly contains
 * the circle of radius `radiusM` around `(lat, lng)`. Cheap SQL filter that
 * the caller follows with the exact Haversine post-filter.
 *
 * The longitude delta widens with latitude (cos(lat)) — we floor cos at 0.01
 * to avoid blow-ups at the poles, which we never hit in AU but cheap to be
 * safe.
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusM: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = (radiusM / 111_320);
  const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  const lngDelta = radiusM / (111_320 * cosLat);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
