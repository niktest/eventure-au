import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { SearchFilters } from "@/components/SearchFilters";

export const metadata: Metadata = {
  title: "All Events",
  description:
    "Browse upcoming events on the Gold Coast — live music, festivals, markets, sports, family activities, and more.",
};

export const revalidate = 3600;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    city?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    free?: string;
  }>;
}) {
  const params = await searchParams;

  const conditions: Prisma.EventWhereInput[] = [
    { status: "published" },
  ];

  // Default: only future events unless a dateFrom is explicitly set in the past
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : new Date();
  conditions.push({ startDate: { gte: dateFrom } });

  if (params.dateTo) {
    const dateTo = new Date(params.dateTo);
    dateTo.setHours(23, 59, 59, 999);
    conditions.push({ startDate: { lte: dateTo } });
  }

  if (params.category) {
    conditions.push({ category: params.category.toUpperCase() as Prisma.EventWhereInput["category"] });
  }

  if (params.city) {
    conditions.push({ city: params.city });
  }

  if (params.free === "1") {
    conditions.push({ isFree: true });
  }

  // Text search: match against name, description, venueName, tags
  if (params.q && params.q.trim()) {
    const term = params.q.trim();
    conditions.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { venueName: { contains: term, mode: "insensitive" } },
        { tags: { has: term.toLowerCase() } },
      ],
    });
  }

  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    events = await prisma.event.findMany({
      where: { AND: conditions },
      orderBy: { startDate: "asc" },
      take: 60,
    });
  } catch {
    // DB unavailable — render empty state, ISR will retry
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 font-heading text-4xl font-bold">Events</h1>

      <Suspense fallback={null}>
        <SearchFilters />
      </Suspense>

      {events.length === 0 ? (
        <p className="text-slate-500">No events found. Check back soon!</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {events.length} event{events.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
