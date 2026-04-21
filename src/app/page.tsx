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
        <h1 className="mb-4 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
          Discover events near you
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-500">
          Live music, festivals, markets, sports, nightlife, and more — all in
          one place. Starting on the Gold Coast.
        </p>
        <div className="mt-8">
          <Link
            href="/events"
            className="inline-block rounded-lg bg-coral px-6 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            Browse all events
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-slate-500">
            No upcoming events yet. Check back soon!
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group rounded-lg border border-slate-300 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.name}
                    className="mb-3 h-48 w-full rounded-md object-cover"
                  />
                )}
                <h3 className="font-heading font-semibold group-hover:text-coral">
                  {event.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(event.startDate).toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-slate-500">{event.venueName}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
