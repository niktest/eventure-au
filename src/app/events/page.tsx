import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { SearchFilters } from "@/components/SearchFilters";
import { TimeWindowChips } from "@/components/TimeWindowChips";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ListEmptyState } from "@/components/events/ListEmptyState";
import { EVENT_CARD_SELECT } from "@/lib/events/eventCardSelect";
import {
  buildEventFilters,
  hasActiveFilters,
  parseNearMeCoords,
  sortEventsByDistance,
  type EventFilterParams,
} from "@/lib/events/eventFilters";
import { getZeroResultSuggestions } from "@/lib/events/zeroResultSuggestions";
import { getTopCategoryForCity } from "@/lib/events/topCategory";
import { getSelectedCity } from "@/lib/location/getSelectedCity";

export const metadata: Metadata = {
  title: "Browse Events",
  description:
    "Browse upcoming events across Australia — live music, festivals, markets, sports, family activities, and more.",
};

// EVE-209: /events scopes by the `festlio_city` cookie, so the route must
// render dynamically (cookie + searchParams both vary the result).
export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventFilterParams>;
}) {
  const params = await searchParams;

  // EVE-209: when the user hasn't picked an explicit city/near filter, fall
  // back to the cookie city so /events stays scoped to where they are.
  // Pickers in the SearchFilters UI can still override either by setting a
  // `location` free-text or by clicking a different city in the header.
  const { city: selectedCity } = await getSelectedCity();
  const effectiveParams: EventFilterParams = { ...params };
  if (!effectiveParams.city && !effectiveParams.near && !effectiveParams.location) {
    effectiveParams.near = selectedCity.slug;
  }

  const where = buildEventFilters(effectiveParams);
  const nearMe = parseNearMeCoords(effectiveParams);

  let events: Array<
    Prisma.EventGetPayload<{ select: typeof EVENT_CARD_SELECT }>
  > = [];
  let availableCategories: string[] = [];
  try {
    const [eventRows, categoryRows] = await Promise.all([
      prisma.event.findMany({
        where,
        select: EVENT_CARD_SELECT,
        // Date order is the default; `sort=nearme` re-orders below in JS so
        // we don't need a Postgres distance function for v1.
        orderBy: { startDate: "asc" },
        take: nearMe ? 200 : 60,
      }),
      // EVE-183: drive category pills from the DB — only categories with at
      // least one upcoming published event, ordered by popularity desc and
      // capped at 12. Independent of the user's current filters so the pill
      // set doesn't collapse as they narrow other filters.
      prisma.event.groupBy({
        by: ["category"],
        where: { status: "published", startDate: { gte: new Date() } },
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
        take: 12,
      }),
    ]);
    events = nearMe
      ? sortEventsByDistance(eventRows, nearMe).slice(0, 60)
      : eventRows;
    availableCategories = categoryRows.map((r) => r.category);
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  // Don't treat the implicit cookie city as an "active filter" — the zero
  // state should still encourage broadening rather than nagging users to
  // clear a filter they didn't set.
  const filtersActive = hasActiveFilters(params);

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-6 py-12">
        <div className="mb-8">
          <h1
            className="font-display text-4xl font-extrabold text-on-surface tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            {params.near || params.city || params.location
              ? "Browse Events"
              : `Events in ${selectedCity.label}`}
          </h1>
          <p className="mt-2 font-body text-lg text-secondary">
            {nearMe
              ? "Sorted by distance from you"
              : "Discover what's happening near you"}
          </p>
        </div>

        <Suspense fallback={<div className="h-[40px] mb-6" />}>
          <div className="mb-6">
            <TimeWindowChips />
          </div>
        </Suspense>

        <Suspense fallback={null}>
          <SearchFilters availableCategories={availableCategories} />
        </Suspense>

        {events.length === 0 ? (
          <ZeroResultState
            params={params}
            citySlug={selectedCity.slug}
            cityLabel={selectedCity.label}
            filtersActive={filtersActive}
          />
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

async function ZeroResultState({
  params,
  citySlug,
  cityLabel,
  filtersActive,
}: {
  params: EventFilterParams;
  citySlug: string;
  cityLabel: string;
  filtersActive: boolean;
}) {
  const topCategory = await getTopCategoryForCity(cityLabel);
  const suggestions = getZeroResultSuggestions(params, {
    citySlug,
    cityLabel,
    topCategory,
  });
  const headline = filtersActive
    ? "Nothing matches those filters."
    : `Nothing scheduled in ${cityLabel} just yet.`;
  const body = filtersActive
    ? "Here are a few ways to broaden your search:"
    : "Try a different angle — there's still plenty to discover.";
  return (
    <div className="mt-6">
      <ListEmptyState
        icon="explore_off"
        headline={headline}
        body={body}
        suggestions={suggestions}
        testId="events-empty"
      />
    </div>
  );
}
