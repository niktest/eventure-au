import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Events Today",
  description:
    "Find events happening today across Australia — live music, festivals, markets, sports, family activities, and more.",
  alternates: {
    canonical: "/today",
  },
};

export const revalidate = 600;

function formatTodayLong(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
}

function getBrisbaneDayWindow(): { start: Date; end: Date } {
  // Brisbane is fixed UTC+10 (Queensland does not observe DST), so we can
  // compute the Brisbane "today" boundaries by shifting from UTC.
  const now = new Date();
  const tzOffsetMs = 10 * 60 * 60 * 1000;
  const brisNow = new Date(now.getTime() + tzOffsetMs);
  const y = brisNow.getUTCFullYear();
  const m = brisNow.getUTCMonth();
  const d = brisNow.getUTCDate();
  // Start of day in Brisbane = 00:00 +10:00 = (previous day) 14:00 UTC
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - tzOffsetMs);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - tzOffsetMs);
  return { start, end };
}

export default async function TodayPage() {
  const { start, end } = getBrisbaneDayWindow();

  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    events = await prisma.event.findMany({
      where: {
        status: "published",
        startDate: { gte: start, lte: end },
      },
      orderBy: { startDate: "asc" },
      take: 100,
    });
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  const todayLabel = formatTodayLong(new Date());
  const eventCount = events.length;

  return (
    <div className="bg-surface-bright min-h-screen">
      {/* Hero banner */}
      <section className="relative overflow-hidden bg-inverse-surface px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary-container/10" />

        <div className="relative z-10 mx-auto max-w-[1280px]">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary-container text-3xl" aria-hidden="true">
              today
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm font-body">
              {todayLabel}
            </span>
            {eventCount > 0 && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm font-body">
                {eventCount} event{eventCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h1
            className="mb-3 font-display text-4xl font-extrabold text-white md:text-5xl tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Happening Today
          </h1>
          <p className="max-w-xl font-body text-lg text-surface-variant">
            Live music, markets, family fun and more — what&apos;s on right now,
            close to you.
          </p>
        </div>
      </section>

      {/* Events grid */}
      <section className="mx-auto max-w-[1280px] px-6 py-12">
        {events.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4 block" aria-hidden="true">
              event_busy
            </span>
            <p className="mb-2 text-secondary font-body">
              No events found for today.
            </p>
            <p className="mb-6 text-sm text-outline font-body">
              Try browsing all upcoming events instead.
            </p>
            <Link
              href="/events"
              className="inline-block rounded-full bg-primary-container px-6 py-3 font-body font-semibold text-on-primary transition-colors hover:bg-primary"
            >
              Browse all events
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm font-semibold text-secondary font-body">
              {eventCount} event{eventCount !== 1 ? "s" : ""} happening today
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
      </section>
    </div>
  );
}
