import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";

const CITIES: Record<string, { name: string; state: string; tagline: string; gradient: string }> = {
  "gold-coast": {
    name: "Gold Coast",
    state: "QLD",
    tagline: "Sun, surf, and sensational events",
    gradient: "from-ocean via-ocean-dark to-coral",
  },
  brisbane: {
    name: "Brisbane",
    state: "QLD",
    tagline: "River city vibes and live entertainment",
    gradient: "from-ocean-dark via-ocean to-sunshine",
  },
  sydney: {
    name: "Sydney",
    state: "NSW",
    tagline: "Harbour city happenings",
    gradient: "from-coral via-sunshine to-ocean",
  },
  melbourne: {
    name: "Melbourne",
    state: "VIC",
    tagline: "Culture, coffee, and creativity",
    gradient: "from-slate-700 via-ocean-dark to-ocean",
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
    <div>
      {/* City hero banner */}
      <section className={`relative overflow-hidden bg-gradient-to-r ${city.gradient} px-4 pb-16 pt-12 md:pb-20 md:pt-16`}>
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {city.state}
            </span>
            {eventCount > 0 && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                {eventCount} upcoming event{eventCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h1 className="mb-3 font-heading text-4xl font-extrabold text-white md:text-5xl">
            Events in {city.name}
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            {city.tagline}. Discover what&apos;s happening — from live music and
            festivals to markets and family fun.
          </p>
        </div>
      </section>

      {/* Events grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        {events.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-16 text-center">
            <svg className="mx-auto mb-4 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mb-4 text-slate-500">
              No upcoming events in {city.name} yet. Check back soon!
            </p>
            <a
              href="/events"
              className="inline-block rounded-lg bg-coral px-6 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              Browse all events
            </a>
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
