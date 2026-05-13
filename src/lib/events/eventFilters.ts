import { Prisma } from "@prisma/client";
import { resolveCategoryFilter, HOMEPAGE_CATEGORIES } from "@/lib/categories";

const NEAR_TO_CITY: Record<string, string> = {
  "gold-coast": "Gold Coast",
  brisbane: "Brisbane",
};

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

  // Date window
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
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
      params.near ||
      params.price ||
      params.free === "1" ||
      params.setting ||
      params.age,
  );
}
