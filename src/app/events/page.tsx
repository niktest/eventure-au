import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { SearchFilters } from "@/components/SearchFilters";
import { ScrollReveal } from "@/components/ScrollReveal";
import { EVENT_CARD_SELECT } from "@/lib/events/eventCardSelect";
import {
  buildEventFilters,
  hasActiveFilters,
  type EventFilterParams,
} from "@/lib/events/eventFilters";

export const metadata: Metadata = {
  title: "Browse Events",
  description:
    "Browse upcoming events across Australia — live music, festivals, markets, sports, family activities, and more.",
};

export const revalidate = 3600;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventFilterParams>;
}) {
  const params = await searchParams;
  const where = buildEventFilters(params);

  let events: Array<
    Prisma.EventGetPayload<{ select: typeof EVENT_CARD_SELECT }>
  > = [];
  let availableCategories: string[] = [];
  try {
    const [eventRows, categoryRows] = await Promise.all([
      prisma.event.findMany({
        where,
        select: EVENT_CARD_SELECT,
        orderBy: { startDate: "asc" },
        take: 60,
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
    events = eventRows;
    availableCategories = categoryRows.map((r) => r.category);
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  const filtersActive = hasActiveFilters(params);

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-6 py-12">
        <div className="mb-8">
          <h1
            className="font-display text-4xl font-extrabold text-on-surface tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Browse Events
          </h1>
          <p className="mt-2 font-body text-lg text-secondary">
            Discover what&apos;s happening near you
          </p>
        </div>

        <Suspense fallback={null}>
          <SearchFilters availableCategories={availableCategories} />
        </Suspense>

        {events.length === 0 ? (
          <ZeroResultState filtersActive={filtersActive} />
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

function ZeroResultState({ filtersActive }: { filtersActive: boolean }) {
  return (
    <div className="rounded-xl bg-surface-container-low py-16 px-6 text-center mt-6">
      <span className="material-symbols-outlined text-4xl text-secondary mb-4 block">
        search
      </span>
      <p className="text-secondary font-body">
        No events found matching your criteria.
      </p>
      {filtersActive ? (
        <>
          <p className="mt-1 text-sm text-outline font-body">
            Try widening your dates or removing a filter.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/events"
              className="rounded-full bg-primary px-5 py-2 font-body text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
            >
              Clear all filters
            </Link>
            <Link
              href="/events?category=music"
              className="rounded-full bg-surface-container px-5 py-2 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Browse music
            </Link>
            <Link
              href="/events?category=family"
              className="rounded-full bg-surface-container px-5 py-2 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Browse family
            </Link>
            <Link
              href="/events?price=free"
              className="rounded-full bg-surface-container px-5 py-2 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Free events
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-outline font-body">
          Check back soon — we&apos;re adding new events every day!
        </p>
      )}
    </div>
  );
}
