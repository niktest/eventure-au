import { Prisma } from "@prisma/client";
import { resolveCategoryFilter, HOMEPAGE_CATEGORIES } from "@/lib/categories";
import { isTimeWindowKey, resolveTimeWindow } from "@/lib/events/timeWindows";
import { SUPPORTED_CITIES } from "@/lib/location/cities";

const NEAR_TO_CITY: Record<string, string> = Object.fromEntries(
  SUPPORTED_CITIES.map((c) => [c.slug, c.label]),
);

export type EventFilterParams = {
  q?: string;
  // Single-slug back-compat (homepage links). Comma-separated multi-select.
  category?: string;
  city?: string;
  /** Free-text suburb/city/venue contains match across city + venueAddress. */
  location?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  near?: string;
  /** "free" | "paid" — replaces legacy `free=1`. */
  price?: string;
  /** Legacy: `free=1`. Still honoured. */
  free?: string;
  /** "indoor" | "outdoor". */
  setting?: string;
  /** "family" | "adults". */
  age?: string;
  /** Named time window: today | tomorrow | weekend | next7 | month (EVE-208). */
  when?: string;
  /** Sort key: "date" (default) | "nearme" (EVE-209). */
  sort?: string;
  /** User latitude — populated when `sort=nearme` (EVE-209). */
  lat?: string;
  /** User longitude — populated when `sort=nearme` (EVE-209). */
  lng?: string;
};

const OUTDOOR_TAGS = ["outdoor", "outdoors", "open-air", "park", "beach"];
const INDOOR_TAGS = ["indoor", "indoors", "venue"];
const FAMILY_TAGS = ["family", "family-friendly", "kids", "all-ages"];
const ADULTS_TAGS = ["18+", "over-18", "adults-only", "21+", "r18"];

function tokenizeCategories(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function categoryConditionForSlug(slug: string): Prisma.EventWhereInput | null {
  const homepageMatch = HOMEPAGE_CATEGORIES.some((c) => c.slug === slug);
  if (homepageMatch) {
    const filter = resolveCategoryFilter(slug);
    if (!filter) return null;
    const orParts: Prisma.EventWhereInput[] = [];
    if (filter.enums?.length) {
      orParts.push({
        category: {
          in: filter.enums as unknown as Prisma.EnumEventCategoryFilter["in"],
        },
      });
    }
    if (filter.tags?.length) {
      orParts.push({ tags: { hasSome: filter.tags } });
    }
    if (orParts.length === 0) return null;
    if (orParts.length === 1) return orParts[0]!;
    return { OR: orParts };
  }
  // Direct enum slug like "music", "outdoor".
  return {
    category: slug.toUpperCase() as Prisma.EventWhereInput["category"],
  };
}

/**
 * Translate URL search params into a Prisma `where` for the events list.
 * Pure / synchronous so the page can keep its single `findMany` call and
 * so this is straightforward to unit test.
 */
export function buildEventFilters(
  params: EventFilterParams,
  now: Date = new Date(),
): Prisma.EventWhereInput {
  const conditions: Prisma.EventWhereInput[] = [{ status: "published" }];

  // Date window. `when=` (named chip) takes precedence over `date` /
  // `dateFrom` / `dateTo` so the visible chip state always matches results.
  if (params.when && isTimeWindowKey(params.when)) {
    const { start, end } = resolveTimeWindow(params.when, now);
    conditions.push({ startDate: { gte: start, lt: end } });
  } else if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    const dayStart = new Date(`${params.date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    conditions.push({ startDate: { gte: dayStart, lt: dayEnd } });
  } else {
    const dateFrom = params.dateFrom ? new Date(params.dateFrom) : now;
    conditions.push({ startDate: { gte: dateFrom } });
    if (params.dateTo) {
      const dateTo = new Date(params.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      conditions.push({ startDate: { lte: dateTo } });
    }
  }

  // Categories (multi-select; OR across selected slugs)
  const categorySlugs = tokenizeCategories(params.category);
  if (categorySlugs.length > 0) {
    const orParts = categorySlugs
      .map((slug) => categoryConditionForSlug(slug))
      .filter((c): c is Prisma.EventWhereInput => c !== null);
    if (orParts.length === 1) conditions.push(orParts[0]!);
    else if (orParts.length > 1) conditions.push({ OR: orParts });
  }

  // Location: legacy `city` (exact), `near` (slug→city), and new `location`
  // contains match over city + venueAddress so "suburb" lookups work.
  if (params.city) {
    conditions.push({ city: params.city });
  }
  if (params.near && NEAR_TO_CITY[params.near]) {
    conditions.push({ city: NEAR_TO_CITY[params.near] });
  }
  if (params.location && params.location.trim()) {
    const loc = params.location.trim();
    conditions.push({
      OR: [
        { city: { contains: loc, mode: "insensitive" } },
        { venueAddress: { contains: loc, mode: "insensitive" } },
        { venueName: { contains: loc, mode: "insensitive" } },
      ],
    });
  }

  // Price band — `price=free|paid`, with legacy `free=1` shim.
  const price = params.price ?? (params.free === "1" ? "free" : undefined);
  if (price === "free") {
    conditions.push({ isFree: true });
  } else if (price === "paid") {
    conditions.push({
      OR: [{ isFree: false }, { priceMin: { gt: 0 } }],
    });
  }

  // Indoor / outdoor — heuristic over `category` + `tags` since the schema
  // has no explicit setting column.
  if (params.setting === "outdoor") {
    conditions.push({
      OR: [
        { category: "OUTDOOR" },
        { tags: { hasSome: OUTDOOR_TAGS } },
      ],
    });
  } else if (params.setting === "indoor") {
    conditions.push({ tags: { hasSome: INDOOR_TAGS } });
  }

  // Age suitability — heuristic over category + tags.
  if (params.age === "family") {
    conditions.push({
      OR: [
        { category: "FAMILY" },
        { tags: { hasSome: FAMILY_TAGS } },
      ],
    });
  } else if (params.age === "adults") {
    conditions.push({
      OR: [
        { category: "NIGHTLIFE" },
        { tags: { hasSome: ADULTS_TAGS } },
      ],
    });
  }

  // Free-text search across name / description / venue / tags.
  if (params.q && params.q.trim()) {
    const term = params.q.trim();
    conditions.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { venueName: { contains: term, mode: "insensitive" } },
        { tags: { has: term.toLowerCase() } },
      ],
    });
  }

  return { AND: conditions };
}

export type NearMeCoords = { lat: number; lng: number };

/**
 * Parse `?sort=nearme&lat=…&lng=…` into a usable coord tuple. Returns null
 * when either coordinate is missing or non-finite so callers can fall back
 * to the default date sort.
 */
export function parseNearMeCoords(
  params: EventFilterParams,
): NearMeCoords | null {
  if (params.sort !== "nearme") return null;
  const lat = params.lat ? Number.parseFloat(params.lat) : NaN;
  const lng = params.lng ? Number.parseFloat(params.lng) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Squared Euclidean distance — fine for ranking. */
function squaredDist(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

/**
 * Sort an event list in-place by distance to `coords`. Events missing
 * lat/lng are pushed to the end so a partial geocoding gap doesn't hide
 * them; among themselves they keep startDate order.
 */
export function sortEventsByDistance<
  T extends { latitude: number | null; longitude: number | null; startDate: Date | string | null },
>(events: T[], coords: NearMeCoords): T[] {
  const withCoords: T[] = [];
  const withoutCoords: T[] = [];
  for (const e of events) {
    if (typeof e.latitude === "number" && typeof e.longitude === "number") {
      withCoords.push(e);
    } else {
      withoutCoords.push(e);
    }
  }
  withCoords.sort((a, b) => {
    const da = squaredDist(coords.lat, coords.lng, a.latitude!, a.longitude!);
    const db = squaredDist(coords.lat, coords.lng, b.latitude!, b.longitude!);
    return da - db;
  });
  return [...withCoords, ...withoutCoords];
}

/**
 * Did the user apply any narrowing filters beyond the default
 * "published, future" view? Used by the zero-result state.
 */
export function hasActiveFilters(params: EventFilterParams): boolean {
  return Boolean(
    (params.q && params.q.trim()) ||
      (params.category && tokenizeCategories(params.category).length > 0) ||
      params.city ||
      (params.location && params.location.trim()) ||
      params.date ||
      params.dateFrom ||
      params.dateTo ||
      (params.when && isTimeWindowKey(params.when)) ||
      params.near ||
      params.price ||
      params.free === "1" ||
      params.setting ||
      params.age,
  );
}
