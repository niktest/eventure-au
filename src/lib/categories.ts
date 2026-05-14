import {
  Music,
  Mic2,
  ShoppingBag,
  UtensilsCrossed,
  Baby,
  Tag,
  Trees,
  Palette,
  Trophy,
  Moon,
  Wrench,
  Users,
  type LucideIcon,
} from "lucide-react";

export type HomepageCategory = {
  label: string;
  slug: string;
  icon: LucideIcon;
};

/**
 * Authoritative homepage category list — 12-chip taxonomy per EVE-215.
 * Order, labels, and slugs are product-approved; do not change without
 * coordinating with Copywriter (EVE-215 owns the spec).
 */
export const HOMEPAGE_CATEGORIES: readonly HomepageCategory[] = [
  { label: "Live Music", slug: "live-music", icon: Music },
  { label: "Comedy", slug: "comedy", icon: Mic2 },
  { label: "Markets", slug: "markets", icon: ShoppingBag },
  { label: "Food & Drink", slug: "food-drink", icon: UtensilsCrossed },
  { label: "Family", slug: "family", icon: Baby },
  { label: "Free", slug: "free", icon: Tag },
  { label: "Outdoors", slug: "outdoors", icon: Trees },
  { label: "Arts", slug: "arts", icon: Palette },
  { label: "Sport", slug: "sport", icon: Trophy },
  { label: "Nightlife", slug: "nightlife", icon: Moon },
  { label: "Workshops", slug: "workshops", icon: Wrench },
  { label: "Community", slug: "community", icon: Users },
] as const;

/**
 * Build the href for a chip. Free is a price predicate, not a category —
 * it routes to the EVE-206 price filter as the canonical `?price=free` shape
 * (EVE-219). `?free=1` is still accepted as an alias for cached chip clicks.
 *
 * When `preserve` is provided, any non-chip-axis params (date, q, dateFrom,
 * dateTo, near, city, radius) carry through so the user's other filters
 * survive a chip click — this is what keeps Browse↔Home state in sync per
 * EVE-229. The chip-axis params (`category`, `price`, `free`) are always
 * replaced because chips are a single mutually-exclusive axis.
 */
export type PreserveParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

const CHIP_AXIS_PARAMS = new Set(["category", "price", "free"]);

function toSearchParams(input: PreserveParams): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, v);
  }
  return sp;
}

function appendPreserved(target: URLSearchParams, preserve?: PreserveParams) {
  if (!preserve) return;
  const src = toSearchParams(preserve);
  for (const [k, v] of src.entries()) {
    if (CHIP_AXIS_PARAMS.has(k)) continue;
    target.append(k, v);
  }
}

export function categoryHref(slug: string, preserve?: PreserveParams): string {
  const params = new URLSearchParams();
  appendPreserved(params, preserve);
  if (slug === "free") params.set("price", "free");
  else params.set("category", slug);
  return `/events?${params.toString()}`;
}

/**
 * Href for the "All" pseudo-chip — clears the chip-axis params but keeps
 * date/q/range/near so the user's other filters survive.
 */
export function allCategoriesHref(preserve?: PreserveParams): string {
  const params = new URLSearchParams();
  appendPreserved(params, preserve);
  const qs = params.toString();
  return qs ? `/events?${qs}` : `/events`;
}

/**
 * Build the href that toggles `slug` in/out of a comma-separated multi-select
 * `?category=` list. Used on /events per EVE-230 wireframes; the homepage chip
 * row stays single-select via {@link categoryHref}.
 *
 * - Free is a price predicate (not a category), so it toggles `?price=free`
 *   independently of the category list — picking Free while two categories
 *   are selected keeps those categories selected.
 * - Removing the last selected category drops the param entirely so the URL
 *   stays clean and the "All" chip reads as active.
 * - Non-chip-axis params in `preserve` (date, q, dateFrom, dateTo, near, …)
 *   carry through; chip-axis params are reconstructed from `activeSlugs`.
 */
export function categoryToggleHref(
  slug: string,
  activeSlugs: readonly string[],
  preserve?: PreserveParams,
  options?: { freeActive?: boolean },
): string {
  const params = new URLSearchParams();
  appendPreserved(params, preserve);
  const freeActive = options?.freeActive ?? false;
  if (slug === "free") {
    // Toggle the price predicate; keep any category list intact.
    if (!freeActive) params.set("price", "free");
    if (activeSlugs.length > 0) params.set("category", activeSlugs.join(","));
    const qs = params.toString();
    return qs ? `/events?${qs}` : `/events`;
  }
  const next = new Set(activeSlugs);
  if (next.has(slug)) next.delete(slug);
  else next.add(slug);
  if (next.size > 0) params.set("category", Array.from(next).join(","));
  if (freeActive) params.set("price", "free");
  const qs = params.toString();
  return qs ? `/events?${qs}` : `/events`;
}

/**
 * Resolve a spec category slug into a Prisma `EventCategory` enum filter
 * and/or a tag-search filter. The Prisma schema models 13 enum values
 * (MUSIC, FESTIVAL, MARKETS, SPORTS, FAMILY, NIGHTLIFE, FOOD_DRINK, ARTS,
 * COMMUNITY, COMEDY, THEATRE, OUTDOOR, OTHER); Workshops is the only chip
 * without an enum yet and falls back to tag matching.
 *
 * Free is intentionally absent — it's a price filter, handled separately.
 */
export type CategoryFilter = {
  /** Uppercase Prisma enum values to OR into the category filter. */
  enums?: string[];
  /** Lowercase tag tokens to OR into the tags filter. */
  tags?: string[];
};

const SLUG_TO_FILTER: Record<string, CategoryFilter> = {
  "live-music": { enums: ["MUSIC"] },
  "comedy": { enums: ["COMEDY"] },
  "markets": { enums: ["MARKETS"] },
  "food-drink": { enums: ["FOOD_DRINK"] },
  "family": { enums: ["FAMILY"] },
  "outdoors": { enums: ["OUTDOOR"] },
  "arts": { enums: ["ARTS"] },
  "sport": { enums: ["SPORTS"] },
  "nightlife": { enums: ["NIGHTLIFE"] },
  "workshops": { tags: ["workshop"] },
  "community": { enums: ["COMMUNITY"] },
};

export function resolveCategoryFilter(slug: string): CategoryFilter | null {
  return SLUG_TO_FILTER[slug] ?? null;
}
