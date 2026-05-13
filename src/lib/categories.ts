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
 */
export function categoryHref(slug: string): string {
  if (slug === "free") return `/events?price=free`;
  return `/events?category=${slug}`;
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
