import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Events",
  description:
    "Browse upcoming events on the Gold Coast — live music, festivals, markets, sports, family activities, and more.",
};

export const revalidate = 3600;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string }>;
}) {
  const params = await searchParams;
  const where: Record<string, unknown> = {
    startDate: { gte: new Date() },
    status: "published",
  };
  if (params.category) {
    where.category = params.category.toUpperCase();
  }
  if (params.city) {
    where.city = params.city;
  }

  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    events = await prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      take: 50,
    });
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  const categories = [
    "MUSIC",
    "FESTIVAL",
    "MARKETS",
    "SPORTS",
    "FAMILY",
    "NIGHTLIFE",
    "FOOD_DRINK",
    "ARTS",
    "COMEDY",
    "THEATRE",
    "OUTDOOR",
    "COMMUNITY",
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Events</h1>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/events"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !params.category
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/events?category=${cat.toLowerCase()}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              params.category?.toUpperCase() === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.replace("_", " & ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAnd\b/, "&")}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <p className="text-gray-500">No events found. Check back soon!</p>
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
              {event.isFree && (
                <span className="mt-1 inline-block text-xs font-semibold text-green-600">
                  FREE
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
