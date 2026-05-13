import type { EventFilterParams } from "@/lib/events/eventFilters";
import { isTimeWindowKey } from "@/lib/events/timeWindows";

export type ZeroResultSuggestion = {
  /** Stable identifier — used as the React key and in tests. */
  key: string;
  label: string;
  href: string;
};

export type ZeroResultContext = {
  /** Slug of the city currently in scope (anchors broaden hrefs to `near=`). */
  citySlug?: string | null;
  /** Display label for the city (used in suggestion copy). */
  cityLabel?: string | null;
  /**
   * Most popular category for the city right now. Drives the
   * "Browse {category} in {city}" suggestion. Pass null when unknown.
   */
  topCategory?: { slug: string; label: string } | null;
};

/**
 * Order in which we drop active filters to broaden a zero-result page.
 * Earlier entries are considered "more restrictive" — a free-text query
 * is the first thing to relax, the city anchor is the last.
 *
 * EVE-213: kept as a fixed order so the recovery URL for a given filter
 * set is deterministic and unit-testable.
 */
const RESTRICTIVENESS_ORDER: ReadonlyArray<keyof EventFilterParams> = [
  "q",
  "setting",
  "age",
  "price",
  "free",
  "when",
  "date",
  "dateFrom",
  "dateTo",
  "category",
  "location",
];

/**
 * Build a deterministic list of recovery actions for a zero-result list
 * view. Pure — same input always produces the same output, so the
 * caller's tests can assert the exact URL set.
 *
 * Strategy: present 1-3 actions that broaden the current filter set by
 * removing the most restrictive condition, plus opinionated jump-off
 * points ("this weekend", "top category"), plus a final "clear filters"
 * fallback whenever any narrowing is in play. We always return at least
 * one suggestion so the page never dead-ends.
 */
export function getZeroResultSuggestions(
  params: EventFilterParams,
  ctx: ZeroResultContext = {},
): ZeroResultSuggestion[] {
  const out: ZeroResultSuggestion[] = [];
  const citySlug = ctx.citySlug ?? null;
  const cityLabel = ctx.cityLabel ?? null;
  const topCategory = ctx.topCategory ?? null;

  if (params.when !== "weekend") {
    out.push({
      key: "weekend",
      label: cityLabel
        ? `Try this weekend in ${cityLabel}`
        : "Try this weekend",
      href: citySlug
        ? `/events?near=${citySlug}&when=weekend`
        : "/events?when=weekend",
    });
  }

  if (topCategory && !categoryMatches(params.category, topCategory.slug)) {
    out.push({
      key: "top-category",
      label: cityLabel
        ? `Browse ${topCategory.label} in ${cityLabel}`
        : `Browse ${topCategory.label} near you`,
      href: citySlug
        ? `/events?near=${citySlug}&category=${topCategory.slug}`
        : `/events?category=${topCategory.slug}`,
    });
  }

  const broaden = buildBroadenSuggestion(params, citySlug, cityLabel);
  if (broaden) out.push(broaden);

  if (hasActiveNarrowing(params)) {
    out.push({
      key: "clear",
      label: "Clear all filters",
      href: citySlug ? `/events?near=${citySlug}` : "/events",
    });
  }

  // City fallback — when there is genuinely nothing else to offer (e.g. the
  // DB is empty and no filters are set), still give the user somewhere to go.
  if (out.length === 0) {
    out.push({
      key: "browse-all",
      label: cityLabel ? `Browse all events in ${cityLabel}` : "Browse all events",
      href: citySlug ? `/events?near=${citySlug}` : "/events",
    });
  }

  // De-dup by href so e.g. "broaden by dropping the only filter" doesn't
  // collide with "clear all filters".
  const seen = new Set<string>();
  return out.filter((s) => {
    if (seen.has(s.href)) return false;
    seen.add(s.href);
    return true;
  });
}

function categoryMatches(raw: string | undefined, slug: string): boolean {
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(slug);
}

function hasActiveNarrowing(p: EventFilterParams): boolean {
  return Boolean(
    p.q?.trim() ||
      p.category ||
      p.city ||
      p.location?.trim() ||
      p.date ||
      p.dateFrom ||
      p.dateTo ||
      (p.when && isTimeWindowKey(p.when)) ||
      p.price ||
      p.free === "1" ||
      p.setting ||
      p.age,
  );
}

function buildBroadenSuggestion(
  params: EventFilterParams,
  citySlug: string | null,
  cityLabel: string | null,
): ZeroResultSuggestion | null {
  for (const key of RESTRICTIVENESS_ORDER) {
    const value = params[key];
    if (!value) continue;
    if (key === "free" && params.free !== "1") continue;
    if (key === "when" && !isTimeWindowKey(value)) continue;

    const next: Record<string, string> = {};
    for (const k of Object.keys(params) as Array<keyof EventFilterParams>) {
      if (k === key) continue;
      // When dropping `when`, also drop redundant `date*` so the broadened
      // URL doesn't immediately re-apply a competing time filter.
      if (
        key === "when" &&
        (k === "date" || k === "dateFrom" || k === "dateTo")
      ) {
        continue;
      }
      if (
        (key === "date" || key === "dateFrom" || key === "dateTo") &&
        k === "when"
      ) {
        continue;
      }
      const v = params[k];
      if (typeof v === "string" && v.length > 0) next[k] = v;
    }
    // Anchor to the current city if no explicit city filter remains.
    if (citySlug && !next.city && !next.near && !next.location) {
      next.near = citySlug;
    }
    const qs = new URLSearchParams(next).toString();
    const href = qs ? `/events?${qs}` : "/events";
    return {
      key: `broaden-${String(key)}`,
      label: describeBroaden(key, cityLabel),
      href,
    };
  }
  return null;
}

function describeBroaden(
  key: keyof EventFilterParams,
  cityLabel: string | null,
): string {
  switch (key) {
    case "q":
      return "Drop the search keywords";
    case "setting":
      return "Show indoor and outdoor events";
    case "age":
      return "Show events for all ages";
    case "price":
    case "free":
      return cityLabel
        ? `Browse all prices in ${cityLabel}`
        : "Browse all prices";
    case "when":
    case "date":
    case "dateFrom":
    case "dateTo":
      return cityLabel
        ? `See all upcoming dates in ${cityLabel}`
        : "See all upcoming dates";
    case "category":
      return cityLabel
        ? `Browse all categories in ${cityLabel}`
        : "Browse all categories";
    case "location":
      return "Widen the location";
    default:
      return "Widen your search";
  }
}
