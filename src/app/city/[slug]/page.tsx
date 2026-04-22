import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = CITIES[slug];
  if (!city) return notFound();

  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  let eventCount = 0;
  try {
    events = await prisma.event.findMany({
      where: {
        city: city.name,
        startDate: { gte: new Date() },
        status: "published",
      },
      orderBy: { startDate: "asc" },
      take: 50,
    });
    eventCount = events.length;
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

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
                {eventCount} upcoming event{eventCount !== 1 ? "s" : ""}
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

      {/* Events grid */}
      <section className="mx-auto max-w-[1280px] px-6 py-12">
        {events.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4 block">
              calendar_month
            </span>
            <p className="mb-4 text-secondary font-body">
              No upcoming events in {city.name} yet. Check back soon!
            </p>
            <Link
              href="/events"
              className="inline-block rounded-full bg-primary-container px-6 py-3 font-body font-semibold text-on-primary transition-colors hover:bg-primary"
            >
              Browse all events
            </Link>
          </div>
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
