import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eventJsonLd } from "@/lib/seo/schema";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ShareButtons } from "@/components/ShareButtons";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(event)) }}
      />

      {/* Hero image */}
      <div className="relative h-64 w-full bg-gradient-to-r from-ocean to-coral sm:h-80 md:h-96">
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/events"
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Events
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 pb-16">
        {/* Title card overlapping hero */}
        <div className="-mt-16 relative z-10 rounded-xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ocean-light px-3 py-1 text-sm font-medium text-ocean">
              <CategoryIcon category={event.category} size="sm" />
              {formatCategory(event.category)}
            </span>
            {event.isFree && (
              <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                FREE
              </span>
            )}
          </div>

          <h1 className="mb-4 font-heading text-3xl font-bold sm:text-4xl">{event.name}</h1>

          {/* Share buttons */}
          <ShareButtons title={event.name} slug={event.slug} />
        </div>

        {/* Event details grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <svg className="h-4 w-4 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date &amp; Time
            </div>
            <p className="font-semibold text-slate-900">{formatDate(event.startDate)}</p>
            <p className="text-sm text-slate-600">
              {formatTime(event.startDate)}
              {event.endDate && ` – ${formatTime(event.endDate)}`}
            </p>
          </div>

          {event.venueName && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <svg className="h-4 w-4 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Venue
              </div>
              <p className="font-semibold text-slate-900">{event.venueName}</p>
              <p className="text-sm text-slate-600">{event.city}, {event.state}</p>
            </div>
          )}

          {!event.isFree && (event.priceMin || event.priceMax) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <svg className="h-4 w-4 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Price
              </div>
              <p className="font-semibold text-slate-900">
                {event.priceMin && event.priceMax
                  ? `$${event.priceMin} – $${event.priceMax}`
                  : event.priceMin
                    ? `From $${event.priceMin}`
                    : `Up to $${event.priceMax}`}
              </p>
              <p className="text-sm text-slate-600">{event.currency}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 font-heading text-xl font-bold text-slate-900">About this event</h2>
            <div className="prose max-w-none text-slate-700">
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow inline-flex items-center gap-2 rounded-lg bg-coral px-8 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-coral-dark hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Get tickets
            </a>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-8 py-3.5 font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Event website
            </a>
          )}
        </div>

        {/* Map embed for venue */}
        {event.venueName && event.latitude && event.longitude && (
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <iframe
              title={`Map of ${event.venueName}`}
              width="100%"
              height="300"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''}&q=${encodeURIComponent(event.venueName + ', ' + event.city)}&center=${event.latitude},${event.longitude}&zoom=15`}
            />
          </div>
        )}

        {/* Similar events */}
        {similarEvents.length > 0 && (
          <section className="mt-16">
            <ScrollReveal>
              <h2 className="mb-6 font-heading text-2xl font-bold text-slate-900">
                Similar events
              </h2>
            </ScrollReveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarEvents.map((ev, i) => (
                <ScrollReveal key={ev.id} delay={i * 0.05}>
                  <EventCard event={ev} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
