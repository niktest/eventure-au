import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { HeroSection } from "@/components/HeroSection";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { CategoryIcon } from "@/components/CategoryIcon";
import { WaveDivider } from "@/components/WaveDivider";

export const revalidate = 3600; // ISR: revalidate homepage every hour

const FEATURED_CATEGORIES = [
  { key: "MUSIC", label: "Live Music", desc: "Gigs, concerts & DJ sets" },
  { key: "FESTIVAL", label: "Festivals", desc: "Multi-day experiences" },
  { key: "MARKETS", label: "Markets", desc: "Local produce & crafts" },
  { key: "SPORTS", label: "Sports", desc: "Games & active events" },
  { key: "FAMILY", label: "Family", desc: "Fun for all ages" },
  { key: "FOOD_DRINK", label: "Food & Drink", desc: "Tastings & dining" },
  { key: "ARTS", label: "Arts", desc: "Exhibitions & galleries" },
  { key: "NIGHTLIFE", label: "Nightlife", desc: "Clubs & late nights" },
];

export default async function HomePage() {
  let upcomingEvents: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  let totalCount = 0;
  let cityCount = 0;
  let venueCount = 0;
  try {
    upcomingEvents = await prisma.event.findMany({
      where: {
        startDate: { gte: new Date() },
        status: "published",
      },
      orderBy: { startDate: "asc" },
      take: 12,
    });
    totalCount = await prisma.event.count({
      where: { status: "published", startDate: { gte: new Date() } },
    });
    const cities = await prisma.event.findMany({
      where: { status: "published" },
      distinct: ["city"],
      select: { city: true },
    });
    cityCount = cities.length;
    const venues = await prisma.event.findMany({
      where: { status: "published", venueName: { not: null } },
      distinct: ["venueName"],
      select: { venueName: true },
    });
    venueCount = venues.length;
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  return (
    <div>
      {/* Hero Section */}
      <HeroSection />

      {/* Stats counters */}
      <section className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-8 px-4">
          <AnimatedCounter target={totalCount || 500} suffix="+" label="Events listed" />
          <AnimatedCounter target={cityCount || 4} suffix="+" label="Cities covered" />
          <AnimatedCounter target={venueCount || 50} suffix="+" label="Venues" />
        </div>
      </section>

      {/* Category browsing */}
      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollReveal>
            <div className="mb-10 text-center">
              <h2 className="font-heading text-3xl font-bold text-slate-900">
                Browse by category
              </h2>
              <p className="mt-2 text-slate-500">
                Find exactly what you&apos;re looking for
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
            {FEATURED_CATEGORIES.map((cat, i) => (
              <ScrollReveal key={cat.key} delay={i * 0.05}>
                <Link
                  href={`/events?category=${cat.key.toLowerCase()}`}
                  className="group flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <CategoryIcon category={cat.key} size="md" />
                  <div className="text-center">
                    <p className="font-heading text-sm font-semibold text-slate-900 group-hover:text-coral">
                      {cat.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{cat.desc}</p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollReveal>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="font-heading text-3xl font-bold text-slate-900">
                  Upcoming events
                </h2>
                <p className="mt-2 text-slate-500">
                  Don&apos;t miss what&apos;s happening next
                </p>
              </div>
              <Link
                href="/events"
                className="hidden text-sm font-semibold text-coral transition-colors hover:text-coral-dark sm:inline-flex sm:items-center sm:gap-1"
              >
                View all
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </ScrollReveal>
          {upcomingEvents.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-16 text-center">
              <svg className="mx-auto mb-4 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-500">
                No upcoming events yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event, i) => (
                <ScrollReveal key={event.id} delay={i * 0.05}>
                  <EventCard event={event} />
                </ScrollReveal>
              ))}
            </div>
          )}
          <div className="mt-10 text-center sm:hidden">
            <Link
              href="/events"
              className="inline-block rounded-lg bg-coral px-8 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              View all events
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <WaveDivider fill="#1A1D23" />
      <section className="bg-slate-900 py-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <ScrollReveal>
            <h2 className="mb-4 font-heading text-3xl font-bold text-white">
              Never miss an event
            </h2>
            <p className="mb-8 text-slate-400">
              Eventure is growing fast. Starting on the Gold Coast, expanding to
              Brisbane, then all of Australia.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/events"
                className="inline-block rounded-lg bg-coral px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-coral-dark hover:shadow-xl"
              >
                Explore events
              </Link>
              <Link
                href="/about"
                className="inline-block rounded-lg border border-slate-600 px-8 py-3.5 font-semibold text-slate-300 transition-all hover:border-slate-400 hover:text-white"
              >
                Learn more
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
