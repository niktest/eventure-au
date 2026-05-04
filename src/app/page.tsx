import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { HeroSection } from "@/components/HeroSection";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CalendarStrip } from "@/components/home/CalendarStrip";
import { HomepageCategoryRow } from "@/components/home/HomepageCategoryRow";
import { NearMeButton } from "@/components/home/NearMeButton";
import { buildCalendarDays } from "@/lib/calendar/buildCalendarDays";

export const revalidate = 3600;

export default async function HomePage() {
  const calendarDays = await buildCalendarDays({ withCounts: true });

  let upcomingEvents: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  let totalCount = 0;
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
  } catch {
    // DB unavailable — render empty state, ISR will retry.
  }

  return (
    <div className="min-h-screen bg-surface-bright">
      <HeroSection>
        <NearMeButton />
      </HeroSection>

      <section
        aria-label="Browse by date and category"
        className="relative"
        style={{ background: "var(--color-surface-0)" }}
      >
        <div className="max-w-[1280px] mx-auto px-6 pb-10 md:pb-12 flex flex-col gap-6">
          <CalendarStrip days={calendarDays} />
          <HomepageCategoryRow />
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-12">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">
              Upcoming Events
            </h2>
            <Link
              href="/events"
              className="text-primary font-body text-sm font-semibold hover:underline flex items-center gap-1"
            >
              View all
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="rounded-xl bg-surface-container-low py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-secondary mb-4 block">
                calendar_month
              </span>
              <p className="text-secondary font-body">
                No upcoming events yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event, i) => (
                <ScrollReveal key={event.id} delay={i * 0.05}>
                  <EventCard event={event} variant="homepage" />
                </ScrollReveal>
              ))}
            </div>
          )}

          {totalCount > 12 && (
            <div className="mt-8 text-center">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-primary text-on-primary rounded-full px-8 py-3 font-body font-semibold hover:scale-[1.02] transition-transform shadow-sm"
              >
                Browse all {totalCount} events
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold text-on-surface mb-6 tracking-tight">
            Explore by City
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Gold Coast", slug: "gold-coast", icon: "surfing" },
              { name: "Brisbane", slug: "brisbane", icon: "location_city" },
              { name: "Sydney", slug: "sydney", icon: "sailing" },
              { name: "Melbourne", slug: "melbourne", icon: "coffee" },
            ].map((city) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className="group bg-surface-container-lowest rounded-xl p-6 border border-surface-container-high shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <span className="material-symbols-outlined text-3xl text-primary-container mb-2 block group-hover:scale-110 transition-transform">
                  {city.icon}
                </span>
                <p className="font-heading text-base font-bold text-on-surface">
                  {city.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
