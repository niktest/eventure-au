import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { HeroSection } from "@/components/HeroSection";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CalendarStrip } from "@/components/home/CalendarStrip";
import { HomepageCategoryRow } from "@/components/home/HomepageCategoryRow";
import { NearMeButton } from "@/components/home/NearMeButton";
import { buildCalendarDays } from "@/lib/calendar/buildCalendarDays";
import { parseDateParam, formatDateLabel } from "@/lib/calendar/dateFilter";
import { EVENT_CARD_SELECT } from "@/lib/events/eventCardSelect";
import {
  itemListJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/schema";
import { getSiteUrl } from "@/lib/seo/site-url";

// `searchParams` opts this page into dynamic rendering when `?date` is present
// so the calendar-strip filter actually takes effect (EVE-163).
export const revalidate = 3600;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const dateRange = parseDateParam(params.date);
  const selectedDate = dateRange ? params.date! : null;

  const where: Prisma.EventWhereInput = dateRange
    ? {
        status: "published",
        startDate: { gte: dateRange.dayStart, lt: dateRange.dayEnd },
      }
    : {
        status: "published",
        startDate: { gte: new Date() },
      };

  let calendarDays: Awaited<ReturnType<typeof buildCalendarDays>> = [];
  let upcomingEvents: Array<
    Prisma.EventGetPayload<{ select: typeof EVENT_CARD_SELECT }>
  > = [];
  let totalCount = 0;
  try {
    // Fire calendar + grid + count in parallel so the homepage waits on the
    // slowest single Neon round-trip rather than three sequential ones.
    const [calDays, events, count] = await Promise.all([
      buildCalendarDays({ withCounts: true }),
      prisma.event.findMany({
        where,
        select: EVENT_CARD_SELECT,
        orderBy: { startDate: "asc" },
        take: 12,
      }),
      prisma.event.count({ where }),
    ]);
    calendarDays = calDays;
    upcomingEvents = events;
    totalCount = count;
  } catch {
    // DB unavailable — render empty state, ISR will retry.
    calendarDays = await buildCalendarDays();
  }

  const siteUrl = getSiteUrl();
  const itemList = itemListJsonLd(
    upcomingEvents.map((event) => ({
      name: event.name,
      url: `${siteUrl}/events/${event.slug}`,
    })),
  );
  const jsonLd = [websiteJsonLd(), organizationJsonLd(), itemList];

  return (
    <div className="min-h-screen bg-surface-bright">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection>
        <Suspense fallback={null}>
          <NearMeButton />
        </Suspense>
      </HeroSection>

      <section
        aria-label="Browse by date and category"
        className="relative"
        style={{ background: "var(--color-surface-0)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6 pb-10 md:pb-12 flex flex-col gap-6">
          <Suspense fallback={<div className="h-[84px] md:h-[92px] lg:h-[104px]" />}>
            <CalendarStrip days={calendarDays} />
          </Suspense>
          <HomepageCategoryRow preserve={selectedDate ? { date: selectedDate } : undefined} />
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-12">
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">
                {selectedDate
                  ? `Events on ${formatDateLabel(selectedDate)}`
                  : "Upcoming Events"}
              </h2>
              {selectedDate && (
                <Link
                  href="/"
                  scroll={false}
                  className="text-primary font-body text-sm font-semibold hover:underline"
                >
                  Clear date
                </Link>
              )}
            </div>
            <Link
              href={selectedDate ? `/events?date=${selectedDate}` : "/events"}
              className="text-primary font-body text-sm font-semibold hover:underline flex items-center gap-1"
            >
              View all
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div
              data-testid="home-events-empty"
              className="rounded-xl bg-surface-container-low py-16 text-center"
            >
              <span className="material-symbols-outlined text-4xl text-secondary mb-4 block">
                calendar_month
              </span>
              <p className="text-secondary font-body">
                {selectedDate
                  ? `No events on ${formatDateLabel(selectedDate)}.`
                  : "No upcoming events yet. Check back soon!"}
              </p>
              {selectedDate && (
                <Link
                  href="/"
                  scroll={false}
                  className="mt-4 inline-block text-primary font-body text-sm font-semibold hover:underline"
                >
                  Show all upcoming events
                </Link>
              )}
            </div>
          ) : (
            <div
              data-testid="home-events-grid"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {upcomingEvents.map((event, i) => (
                <ScrollReveal key={event.id} delay={i * 0.05}>
                  <EventCard event={event} variant="homepage" />
                </ScrollReveal>
              ))}
            </div>
          )}

          {totalCount > 12 && (
            <div className="mt-8 text-center">
              <Link
                href={selectedDate ? `/events?date=${selectedDate}` : "/events"}
                className="inline-flex items-center gap-2 bg-primary text-on-primary rounded-full px-8 py-3 font-body font-semibold hover:scale-[1.02] transition-transform shadow-sm"
              >
                {selectedDate
                  ? `Browse all ${totalCount} events on ${formatDateLabel(selectedDate)}`
                  : `Browse all ${totalCount} events`}
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-on-surface mb-6 tracking-tight">
            Explore by City
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Gold Coast", slug: "gold-coast", icon: "surfing" },
              { name: "Brisbane", slug: "brisbane", icon: "location_city" },
              { name: "Sydney", slug: "sydney", icon: "sailing" },
              { name: "Melbourne", slug: "melbourne", icon: "coffee" },
            ].map((city) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className="group bg-surface-container-lowest rounded-xl p-6 border border-surface-container-high shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <span className="material-symbols-outlined text-3xl text-primary-container mb-2 block group-hover:scale-110 transition-transform">
                  {city.icon}
                </span>
                <p className="font-heading text-base font-bold text-on-surface">
                  {city.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
