import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";

const CITIES: Record<string, { name: string; state: string }> = {
  "gold-coast": { name: "Gold Coast", state: "QLD" },
  brisbane: { name: "Brisbane", state: "QLD" },
  sydney: { name: "Sydney", state: "NSW" },
  melbourne: { name: "Melbourne", state: "VIC" },
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
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 rounded-lg bg-ocean-light px-6 py-8">
        <h1 className="mb-2 font-heading text-4xl font-bold text-slate-900">
          Events in {city.name}
        </h1>
        <p className="text-lg text-ocean-dark">
          Discover what&apos;s happening in {city.name}, {city.state}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
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
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
