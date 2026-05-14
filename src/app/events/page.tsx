import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { SearchFilters } from "@/components/SearchFilters";
import { ScrollReveal } from "@/components/ScrollReveal";
import { HomepageCategoryRow } from "@/components/home/HomepageCategoryRow";
import { EventsNearMeControl } from "@/components/events/EventsNearMeControl";
import { resolveCategoryFilter, HOMEPAGE_CATEGORIES } from "@/lib/categories";
import { formatDateLabel } from "@/lib/calendar/dateFilter";
import { EVENT_CARD_SELECT } from "@/lib/events/eventCardSelect";
import {
  boundingBox,
  haversineMeters,
  isWhenValue,
  parseCategorySlugs,
  resolveNearMeQuery,
  resolveWhenWindow,
} from "@/lib/events/queryFilters";

export const metadata: Metadata = {
  title: "Browse Events",
  description:
    "Browse upcoming events across Australia — live music, festivals, markets, sports, family activities, and more.",
};

export const revalidate = 3600;

const NEAR_TO_CITY: Record<string, string> = {
  "gold-coast": "Gold Coast",
  "brisbane": "Brisbane",
};

const EVENT_CARD_SELECT_WITH_GEO = {
  ...EVENT_CARD_SELECT,
  latitude: true,
  longitude: true,
} as const satisfies Prisma.EventSelect;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    city?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    when?: string;
    near?: string;
    near_me?: string;
    lat?: string;
    lng?: string;
    max_radius_m?: string;
    radius?: string;
    free?: string;
    price?: string;
  }>;
}) {
  const params = await searchParams;

  const conditions: Prisma.EventWhereInput[] = [
    { status: "published" },
  ];

  // EVE-230: ?when=today|tomorrow takes precedence over the explicit ?date=
  // window because the user picked a relative chip. Both being set is rare
  // (defensive deep links from cached state) but if it happens we honour the
  // chip per the wireframes.
  const whenWindow = resolveWhenWindow(params.when);
  if (whenWindow) {
    conditions.push({
      startDate: { gte: whenWindow.start, lt: whenWindow.end },
    });
  } else if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    // ?date=YYYY-MM-DD — same-day window (UTC for v1; venue-local-tz follow-up).
    const dayStart = new Date(`${params.date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    conditions.push({ startDate: { gte: dayStart, lt: dayEnd } });
  } else {
    // Default: only future events unless a dateFrom is explicitly set in the past
    const dateFrom = params.dateFrom ? new Date(params.dateFrom) : new Date();
    conditions.push({ startDate: { gte: dateFrom } });

    if (params.dateTo) {
      const dateTo = new Date(params.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      conditions.push({ startDate: { lte: dateTo } });
    }
  }

  // EVE-230: ?category accepts a comma-separated list for multi-select.
  // Each slug is resolved through the EVE-218 taxonomy (enum and/or tag
  // match) and the resulting predicates are OR'd together.
  const categorySlugs = parseCategorySlugs(params.category);
  if (categorySlugs.length > 0) {
    const orParts: Prisma.EventWhereInput[] = [];
    const enumSet = new Set<string>();
    const tagSet = new Set<string>();
    for (const slug of categorySlugs) {
      const filter = resolveCategoryFilter(slug);
      if (!filter) continue;
      filter.enums?.forEach((e) => enumSet.add(e));
      filter.tags?.forEach((t) => tagSet.add(t));
    }
    if (enumSet.size > 0) {
      orParts.push({
        category: {
          in: Array.from(enumSet) as unknown as Prisma.EnumEventCategoryFilter["in"],
        },
      });
    }
    if (tagSet.size > 0) {
      orParts.push({ tags: { hasSome: Array.from(tagSet) } });
    }
    if (orParts.length === 1) conditions.push(orParts[0]!);
    else if (orParts.length > 1) conditions.push({ OR: orParts });
  } else if (params.category) {
    // Back-compat: a single non-taxonomy slug (e.g. raw enum lowercase) — keep
    // accepting it as the legacy single-value filter so old deep-links work.
    const slug = params.category;
    const homepageMatch = HOMEPAGE_CATEGORIES.some((c) => c.slug === slug);
    if (!homepageMatch) {
      conditions.push({
        category: slug.toUpperCase() as Prisma.EventWhereInput["category"],
      });
    }
  }

  if (params.city) {
    conditions.push({ city: params.city });
  }

  // ?near={citySlug} — v1 city-slug fallback (kept for cached homepage links
  // from before EVE-230). The real radius filter is `near_me` below.
  if (params.near && NEAR_TO_CITY[params.near]) {
    conditions.push({ city: NEAR_TO_CITY[params.near] });
  }

  // EVE-230: real distance filter. We bounding-box in SQL (cheap, uses the
  // existing indexes via lat/lng range) and Haversine-refine in JS after the
  // fetch to drop bounding-box corner matches that fall outside the radius.
  const nearMe = resolveNearMeQuery(params);
  if (nearMe) {
    const bbox = boundingBox(nearMe.lat, nearMe.lng, nearMe.radiusM);
    conditions.push({
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLng, lte: bbox.maxLng },
    });
  }

  // EVE-219: ?price=free is canonical; ?free=1 stays as an alias for cached
  // chip clicks and shared links from before the migration.
  if (params.price === "free" || params.free === "1") {
    conditions.push({ isFree: true });
  }

  // Text search: match against name, description, venueName, tags
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

  let events: Array<
    Prisma.EventGetPayload<{ select: typeof EVENT_CARD_SELECT_WITH_GEO }>
  > = [];
  try {
    const eventRows = await prisma.event.findMany({
      where: { AND: conditions },
      select: EVENT_CARD_SELECT_WITH_GEO,
      orderBy: { startDate: "asc" },
      // Over-fetch for the near-me case so the Haversine refine still has a
      // full page to display after dropping bounding-box corner matches.
      take: nearMe ? 200 : 60,
    });
    if (nearMe) {
      events = eventRows
        .filter(
          (e) =>
            e.latitude !== null &&
            e.longitude !== null &&
            haversineMeters(nearMe.lat, nearMe.lng, e.latitude, e.longitude) <=
              nearMe.radiusM,
        )
        .slice(0, 60);
    } else {
      events = eventRows;
    }
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  // EVE-229/EVE-230: surface the active chip-axis state so the page matches the
  // URL. Free maps onto the EVE-215 Free chip; otherwise the active set is the
  // multi-select category list. Stale slugs from legacy enum links collapse to
  // single-select via the taxonomy check.
  const freeActive = params.price === "free" || params.free === "1";
  const dateActive =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;
  const whenActive = isWhenValue(params.when) ? params.when : null;

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-extrabold text-on-surface tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Browse Events
          </h1>
          <p className="mt-2 font-body text-lg text-secondary">
            Discover what&apos;s happening near you
          </p>
        </div>

        <Suspense fallback={null}>
          <SearchFilters />
        </Suspense>

        {/* EVE-230: Today/Tomorrow chips + Near-me CTA sit above the category
            row so the relative-time and location axes are the first thing the
            user can reach with the keyboard. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <WhenChip active={whenActive} value="today" label="Today" params={params} />
          <WhenChip active={whenActive} value="tomorrow" label="Tomorrow" params={params} />
          <div className="ml-auto">
            <Suspense fallback={null}>
              <EventsNearMeControl />
            </Suspense>
          </div>
        </div>

        {/* EVE-229: single canonical chip row shared with Home, in multi-select
            mode for EVE-230. */}
        <div className="mt-4">
          <HomepageCategoryRow
            active={categorySlugs}
            preserve={params as Record<string, string | undefined>}
            showAllChip
            multi
            freeActive={freeActive}
          />
        </div>

        {/* EVE-229: surface ?date URL state so users from Home's calendar
            strip see what's filtering their results and can clear it. */}
        {dateActive && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-neon-coral/40 bg-surface-1 px-3.5 py-2 font-body text-sm font-semibold text-on-dark-strong">
              <span className="material-symbols-outlined text-[16px]">event</span>
              On {formatDateLabel(dateActive)}
            </span>
            <Link
              href={(() => {
                const next = new URLSearchParams();
                for (const [k, v] of Object.entries(params)) {
                  if (k === "date" || v === undefined) continue;
                  next.set(k, v);
                }
                const qs = next.toString();
                return qs ? `/events?${qs}` : "/events";
              })()}
              className="font-body text-sm font-semibold text-primary hover:underline"
            >
              Clear date
            </Link>
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low py-16 text-center mt-6">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4 block">
              search
            </span>
            <p className="text-secondary font-body">
              No events found matching your criteria.
            </p>
            <p className="mt-1 text-sm text-outline font-body">
              Try adjusting your filters or check back soon!
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 mt-6 text-sm font-semibold text-secondary font-body">
              {events.length} event{events.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <ScrollReveal key={event.id} delay={i * 0.03}>
                  <EventCard event={event} />
                </ScrollReveal>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Server-rendered Today/Tomorrow chip. Renders an <a> link so it's keyboard-
 * focusable, SEO-indexable, and works without JS — matches the EVE-229 chip
 * row contract. Toggles the `when` value off when clicked while active.
 */
function WhenChip({
  active,
  value,
  label,
  params,
}: {
  active: "today" | "tomorrow" | null;
  value: "today" | "tomorrow";
  label: string;
  params: Record<string, string | undefined>;
}) {
  const isActive = active === value;
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    // `when` is mutually exclusive with `date`/`dateFrom`/`dateTo` — clear
    // them so the user's chip click reads exactly as they expect.
    if (k === "when" || k === "date" || k === "dateFrom" || k === "dateTo") continue;
    next.set(k, v);
  }
  if (!isActive) next.set("when", value);
  const qs = next.toString();
  const href = qs ? `/events?${qs}` : "/events";
  return (
    <Link
      href={href}
      aria-pressed={isActive}
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 min-h-[44px] font-body text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow whitespace-nowrap ${
        isActive
          ? "bg-surface-2 border-neon-coral shadow-glow-coral text-on-dark-strong"
          : "bg-surface-1 border-surface-3 text-on-dark-muted hover:bg-surface-2 hover:text-on-dark-strong hover:border-neon-coral/40"
      }`}
    >
      {label}
    </Link>
  );
}
