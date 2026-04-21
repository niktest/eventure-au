import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // ISR: revalidate homepage every hour

export default async function HomePage() {
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startDate: { gte: new Date() },
      status: "published",
    },
    orderBy: { startDate: "asc" },
    take: 12,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Discover events near you
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          Live music, festivals, markets, sports, nightlife, and more — all in
          one place. Starting on the Gold Coast.
        </p>
        <div className="mt-8">
          <Link
            href="/events"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Browse all events
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-500">
            No upcoming events yet. Check back soon!
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
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
      </section>
    </div>
  );
}
