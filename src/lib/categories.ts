import {
  Baby,
  Music,
  MicVocal,
  Trophy,
  Puzzle,
  Users,
  Briefcase,
  Image as LucideImage,
  Wrench,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type HomepageCategory = {
  label: string;
  slug: string;
  icon: LucideIcon;
  /** Whether the active state uses the magenta accent (Pop Up only). */
  magentaAccent?: boolean;
};

/**
 * Authoritative homepage category list — order and labels per EVE-126 §4.2.
 * Do not reorder or rename without product approval.
 */
export const HOMEPAGE_CATEGORIES: readonly HomepageCategory[] = [
  { label: "Family", slug: "family", icon: Baby },
  { label: "Music", slug: "music", icon: Music },
  { label: "Concerts", slug: "concerts", icon: MicVocal },
  { label: "Sport", slug: "sport", icon: Trophy },
  { label: "Hobby", slug: "hobby", icon: Puzzle },
  { label: "Cultural Community", slug: "cultural-community", icon: Users },
  { label: "Business", slug: "business", icon: Briefcase },
  { label: "Exhibitions", slug: "exhibitions", icon: LucideImage },
  { label: "Workshops", slug: "workshops", icon: Wrench },
  { label: "Festivals", slug: "festivals", icon: PartyPopper },
  { label: "Pop Up", slug: "pop-up", icon: Sparkles, magentaAccent: true },
] as const;

export function categoryHref(slug: string): string {
  return `/events?category=${slug}`;
}

/**
 * Resolve a spec category slug into a Prisma `EventCategory` enum filter
 * and/or a tag-search filter. The Prisma schema only models 13 enum values
 * (MUSIC, FESTIVAL, MARKETS, SPORTS, FAMILY, NIGHTLIFE, FOOD_DRINK, ARTS,
 * COMMUNITY, COMEDY, THEATRE, OUTDOOR, OTHER), so spec-only slugs route via
 * tag matching as a v1 fallback. Follow-up tracked separately when the
 * Prisma enum is expanded.
 */
export type CategoryFilter = {
  /** Uppercase Prisma enum values to OR into the category filter. */
  enums?: string[];
  /** Lowercase tag tokens to OR into the tags filter. */
  tags?: string[];
};

const SLUG_TO_FILTER: Record<string, CategoryFilter> = {
  "family": { enums: ["FAMILY"] },
  "music": { enums: ["MUSIC"] },
  "concerts": { enums: ["MUSIC"], tags: ["concert"] },
  "sport": { enums: ["SPORTS"] },
  "hobby": { tags: ["hobby"] },
  "cultural-community": { enums: ["COMMUNITY"], tags: ["culture", "cultural"] },
  "business": { tags: ["business", "networking"] },
  "exhibitions": { enums: ["ARTS"], tags: ["exhibition"] },
  "workshops": { tags: ["workshop"] },
  "festivals": { enums: ["FESTIVAL"] },
  "pop-up": { tags: ["popup", "pop-up"] },
};

export function resolveCategoryFilter(slug: string): CategoryFilter | null {
  return SLUG_TO_FILTER[slug] ?? null;
}
