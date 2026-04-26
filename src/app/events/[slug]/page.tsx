import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eventJsonLd } from "@/lib/seo/schema";
import { ShareButtons } from "@/components/ShareButtons";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { InterestedButton } from "@/components/InterestedButton";
import { EventDiscussPanel } from "@/components/discussions/EventDiscussPanel";
import { listLatestThreadsForEvent } from "@/lib/discussions/queries";
import { auth } from "@/lib/auth";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const events = await prisma.event.findMany({
      where: { status: "published" },
      select: { slug: true },
      take: 500,
    });
    return events.map((e) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return {};
  return {
    title: event.name,
    description:
      event.description?.slice(0, 160) ??
      `${event.name} — ${event.city}, ${event.state}`,
    openGraph: {
      title: event.name,
      description: event.description?.slice(0, 160) ?? undefined,
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
    },
  };
}

function formatCategory(cat: string): string {
  return cat
    .replace("_", " & ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/, "&");
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status === "draft") return notFound();

  // Fetch similar events (same category, different event)
  let similarEvents: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    similarEvents = await prisma.event.findMany({
      where: {
        category: event.category,
        status: "published",
        startDate: { gte: new Date() },
        id: { not: event.id },
      },
      orderBy: { startDate: "asc" },
      take: 3,
    });
  } catch {
    // Non-critical
  }

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  let discussionThreads: Awaited<ReturnType<typeof listLatestThreadsForEvent>> = [];
  try {
    discussionThreads = await listLatestThreadsForEvent({
      eventId: event.id,
      limit: 3,
      viewerId,
    });
  } catch {
    // Non-critical
  }

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatShortDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-AU", {
      month: "short",
      day: "numeric",
    });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(event)) }}
      />

      <div className="bg-surface-bright min-h-screen">
        {/* Hero Section */}
        <section className="relative w-full h-[320px] md:h-[480px] bg-surface-dim overflow-hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-container to-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </section>

        {/* Content Container */}
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 -mt-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16">
          {/* Left Column: Details */}
          <div className="lg:col-span-8 space-y-8">
            {/* Header Card */}
            <div className="bg-surface-bright rounded-xl p-6 md:p-8 shadow-md border border-surface-container-high">
              {/* Category chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-surface-container-low text-on-surface font-body text-sm font-semibold px-4 py-1.5 rounded-full">
                  {formatCategory(event.category)}
                </span>
                {event.isFree && (
                  <span className="bg-success/10 text-success font-body text-sm font-semibold px-4 py-1.5 rounded-full">
                    FREE
                  </span>
                )}
              </div>

              <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-surface mb-3 tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                {event.name}
              </h1>

              {event.description && (
                <p className="font-body text-lg text-secondary mb-6">
                  {event.description.slice(0, 200)}
                  {event.description.length > 200 ? "..." : ""}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-secondary font-body text-sm font-semibold">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">
                    calendar_month
                  </span>
                  <span>
                    {formatShortDate(event.startDate)}
                    {event.endDate && ` - ${formatShortDate(event.endDate)}`}
                  </span>
                </div>
                {event.venueName && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">
                      location_on
                    </span>
                    <span>
                      {event.venueName}, {event.city}
                    </span>
                  </div>
                )}
              </div>

              {/* Share buttons */}
              <div className="mt-4 pt-4 border-t border-surface-container-high">
                <ShareButtons title={event.name} slug={event.slug} />
              </div>
            </div>

            {/* About */}
            {event.description && (
              <section className="space-y-3">
                <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">
                  About this event
                </h2>
                <div className="font-body text-base text-on-surface-variant space-y-4">
                  <p className="whitespace-pre-line">{event.description}</p>
                </div>
              </section>
            )}

            {/* Venue Details */}
            {event.venueName && (
              <section className="space-y-3">
                <h2 className="font-heading text-2xl font-bold text-on-surface tracking-tight">
                  Venue Details
                </h2>
                <div className="bg-surface-bright rounded-xl border border-surface-container-high overflow-hidden flex flex-col md:flex-row">
                  {(() => {
                    const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
                    const hasCoords = event.latitude && event.longitude;
                    const addressQuery = encodeURIComponent(
                      [event.venueName, event.venueAddress, event.city].filter(Boolean).join(", ")
                    );

                    if (mapsKey) {
                      // Google Maps — works with coordinates or address
                      const src = hasCoords
                        ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${addressQuery}&center=${event.latitude},${event.longitude}&zoom=15`
                        : `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${addressQuery}&zoom=15`;
                      return (
                        <div className="w-full md:w-1/2 h-48 md:h-auto bg-surface-dim relative">
                          <iframe title={`Map of ${event.venueName}`} width="100%" height="100%" style={{ border: 0, minHeight: "200px" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={src} />
                        </div>
                      );
                    }

                    if (hasCoords) {
                      // OpenStreetMap with coordinates
                      return (
                        <div className="w-full md:w-1/2 h-48 md:h-auto bg-surface-dim relative">
                          <iframe title={`Map of ${event.venueName}`} width="100%" height="100%" style={{ border: 0, minHeight: "200px" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude! - 0.005},${event.latitude! - 0.005},${event.longitude! + 0.005},${event.latitude! + 0.005}&layer=mapnik&marker=${event.latitude},${event.longitude}`} />
                        </div>
                      );
                    }

                    // No coordinates, no Google key — show a static map link
                    return (
                      <div className="w-full md:w-1/2 h-48 md:h-auto bg-surface-dim relative">
                        <a
                          href={`https://www.openstreetmap.org/search?query=${addressQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full h-full min-h-[200px] bg-surface-container hover:bg-surface-container-high transition-colors group"
                        >
                          <div className="text-center space-y-2">
                            <span className="material-symbols-outlined text-4xl text-primary drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                              location_on
                            </span>
                            <p className="text-sm font-body text-on-surface-variant group-hover:text-primary transition-colors">
                              View on map
                            </p>
                          </div>
                        </a>
                      </div>
                    );
                  })()}
                  <div className="p-6 w-full md:w-1/2 flex flex-col justify-center space-y-1">
                    <h3 className="font-heading text-xl font-bold text-on-surface">
                      {event.venueName}
                    </h3>
                    <p className="font-body text-base text-secondary">
                      {event.venueAddress && <>{event.venueAddress}<br /></>}
                      {event.city}, {event.state}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Booking Card */}
          <div className="lg:col-span-4 mt-8 lg:mt-0 relative">
            <div className="sticky top-[100px] bg-surface-bright rounded-xl p-6 shadow-md border border-surface-container-high space-y-6">
              {/* Quick Details */}
              <ul className="space-y-4 font-body text-base text-on-surface-variant">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">
                    calendar_today
                  </span>
                  <div>
                    <p className="font-semibold text-on-surface text-sm">
                      Date & Time
                    </p>
                    <p className="text-sm">
                      {formatDate(event.startDate)}
                      <br />
                      {formatTime(event.startDate)}
                      {event.endDate && ` – ${formatTime(event.endDate)}`}
                    </p>
                  </div>
                </li>
                {event.venueName && (
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">
                      location_on
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface text-sm">
                        Location
                      </p>
                      <p className="text-sm">
                        {event.venueName}, {event.city}
                      </p>
                    </div>
                  </li>
                )}
                {!event.isFree && (event.priceMin || event.priceMax) && (
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">
                      payments
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface text-sm">
                        Price
                      </p>
                      <p className="text-sm">
                        {event.priceMin && event.priceMax
                          ? `$${event.priceMin} – $${event.priceMax}`
                          : event.priceMin
                            ? `From $${event.priceMin}`
                            : `Up to $${event.priceMax}`}{" "}
                        {event.currency}
                      </p>
                    </div>
                  </li>
                )}
              </ul>

              {/* CTA Buttons */}
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary-container text-on-primary rounded-full py-4 font-heading text-lg font-bold shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    confirmation_number
                  </span>
                  Get Tickets
                </a>
              ) : (
                <InterestedButton eventId={event.id} />
              )}

              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full border-2 border-secondary text-secondary rounded-full py-3 font-body text-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    open_in_new
                  </span>
                  Event Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Discuss this event */}
        <section className="max-w-[1280px] mx-auto px-6 md:px-12 pb-10">
          <EventDiscussPanel
            eventSlug={event.slug}
            eventName={event.name}
            threads={discussionThreads}
            isSignedIn={Boolean(viewerId)}
          />
        </section>

        {/* Similar Events */}
        {similarEvents.length > 0 && (
          <section className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16 space-y-6">
            <div className="flex justify-between items-end">
              <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">
                Similar events you might like
              </h2>
              <Link
                href={`/events?category=${event.category.toLowerCase()}`}
                className="hidden md:inline-block font-body text-sm font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarEvents.map((ev, i) => (
                <ScrollReveal key={ev.id} delay={i * 0.05}>
                  <EventCard event={ev} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
