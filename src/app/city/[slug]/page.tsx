import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

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
      <h1 className="mb-2 text-4xl font-bold">Events in {city.name}</h1>
      <p className="mb-8 text-lg text-gray-600">
        Discover what&apos;s happening in {city.name}, {city.state}
      </p>

      {events.length === 0 ? (
        <p className="text-gray-500">
          No upcoming events in {city.name} yet. Check back soon!
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
            >
              {event.imageUrl && (
                <img
                  src={event.imageUrl}
                  alt={event.name}
                  className="mb-3 h-48 w-full rounded object-cover"
                />
              )}
              <div className="mb-1">
                <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {event.category.replace("_", " & ")}
                </span>
              </div>
              <h3 className="font-semibold group-hover:text-blue-600">
                {event.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(event.startDate).toLocaleDateString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-500">{event.venueName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
