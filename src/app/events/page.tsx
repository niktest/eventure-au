import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { SearchFilters } from "@/components/SearchFilters";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Browse Events",
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
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-extrabold text-on-surface tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Browse Events
          </h1>
          <p className="mt-2 font-body text-lg text-secondary">
            Discover what&apos;s happening near you
          </p>
        </div>

        <Suspense fallback={null}>
          <SearchFilters />
        </Suspense>

        {events.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low py-16 text-center mt-6">
            <span className="material-symbols-outlined text-4xl text-secondary mb-4 block">
              search
            </span>
            <p className="text-secondary font-body">
              No events found matching your criteria.
            </p>
            <p className="mt-1 text-sm text-outline font-body">
              Try adjusting your filters or check back soon!
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 mt-6 text-sm font-semibold text-secondary font-body">
              {events.length} event{events.length !== 1 ? "s" : ""} found
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
      </div>
    </div>
  );
}
