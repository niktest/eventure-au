import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { HomepageCategoryRow } from "@/components/home/HomepageCategoryRow";
import { TimeWindowChips } from "@/components/TimeWindowChips";
import { ListEmptyState } from "@/components/events/ListEmptyState";
import { EVENT_CARD_SELECT } from "@/lib/events/eventCardSelect";
import {
  isTimeWindowKey,
  resolveTimeWindow,
  TIME_WINDOW_LABELS,
} from "@/lib/events/timeWindows";
import { getZeroResultSuggestions } from "@/lib/events/zeroResultSuggestions";
import { getTopCategoryForCity } from "@/lib/events/topCategory";
import { Suspense } from "react";

const CITIES: Record<string, { name: string; state: string; tagline: string; icon: string }> = {
  "gold-coast": {
    name: "Gold Coast",
    state: "QLD",
    tagline: "Sun, surf, and sensational events",
    icon: "surfing",
  },
  brisbane: {
    name: "Brisbane",
    state: "QLD",
    tagline: "River city vibes and live entertainment",
    icon: "location_city",
  },
  sydney: {
    name: "Sydney",
    state: "NSW",
    tagline: "Harbour city happenings",
    icon: "sailing",
  },
  melbourne: {
    name: "Melbourne",
    state: "VIC",
    tagline: "Culture, coffee, and creativity",
    icon: "coffee",
  },
};

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(CITIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = CITIES[slug];
  if (!city) return {};
  return {
    title: `Events in ${city.name}`,
    description: `Discover upcoming events in ${city.name}, ${city.state} — live music, festivals, markets, sports, family activities, and more.`,
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ when?: string }>;
}) {
  const { slug } = await params;
  const city = CITIES[slug];
  if (!city) return notFound();

  const sp = (await searchParams) ?? {};
  const whenKey = isTimeWindowKey(sp.when) ? sp.when : null;
  const whenRange = whenKey ? resolveTimeWindow(whenKey) : null;

  let events: Array<
    Prisma.EventGetPayload<{ select: typeof EVENT_CARD_SELECT }>
  > = [];
  let eventCount = 0;
  try {
    events = await prisma.event.findMany({
      where: {
        city: city.name,
        status: "published",
        startDate: whenRange
          ? { gte: whenRange.start, lt: whenRange.end }
          : { gte: new Date() },
      },
      select: EVENT_CARD_SELECT,
      orderBy: { startDate: "asc" },
      take: 50,
    });
    eventCount = events.length;
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  const topCategory =
    events.length === 0 ? await getTopCategoryForCity(city.name) : null;
  const suggestions =
    events.length === 0
      ? getZeroResultSuggestions(
          whenKey ? { when: whenKey } : {},
          {
            citySlug: slug,
            cityLabel: city.name,
            topCategory,
          },
        )
      : [];

  return (
    <div className="bg-surface-bright min-h-screen">
      {/* City hero banner */}
      <section className="relative overflow-hidden bg-inverse-surface px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary-container/10" />

        <div className="relative z-10 mx-auto max-w-[1280px]">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary-container text-3xl">
              {city.icon}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm font-body">
              {city.state}
            </span>
            {eventCount > 0 && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm font-body">
                {whenKey
                  ? `${eventCount} event${eventCount !== 1 ? "s" : ""} ${TIME_WINDOW_LABELS[whenKey].toLowerCase()}`
                  : `${eventCount} upcoming event${eventCount !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
          <h1 className="mb-3 font-display text-4xl font-extrabold text-white md:text-5xl tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Events in {city.name}
          </h1>
          <p className="max-w-xl font-body text-lg text-surface-variant">
            {city.tagline}. Discover what&apos;s happening — from live music and
            festivals to markets and family fun.
          </p>
        </div>
      </section>

      {/* Category quick-filter chips (EVE-207) — preserve city via &city= */}
      <section
        aria-label="Browse by category"
        className="relative"
        style={{ background: "var(--color-surface-0)" }}
      >
        <div className="mx-auto max-w-[1280px] px-6 py-6 flex flex-col gap-4">
          <Suspense fallback={<div className="h-[40px]" />}>
            <TimeWindowChips ariaLabel="When" />
          </Suspense>
          <HomepageCategoryRow city={city.name} />
        </div>
      </section>

      {/* Events grid */}
      <section className="mx-auto max-w-[1280px] px-6 py-12">
        {events.length === 0 ? (
          <ListEmptyState
            icon="calendar_month"
            headline={
              whenKey
                ? `Nothing in ${city.name} for ${TIME_WINDOW_LABELS[whenKey].toLowerCase()}.`
                : `Nothing scheduled in ${city.name} just yet.`
            }
            body="Try a different angle — there's still plenty to discover."
            suggestions={suggestions}
            testId="city-empty"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <ScrollReveal key={event.id} delay={i * 0.04}>
                <EventCard event={event} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
