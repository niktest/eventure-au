import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eventJsonLd } from "@/lib/seo/schema";

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
    // DB unavailable at build time — pages will be generated on-demand via ISR
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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status === "draft") return notFound();

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
      <article className="mx-auto max-w-4xl px-4 py-12">
        {event.imageUrl && (
          <div className="relative mb-8 aspect-[2/1] w-full overflow-hidden rounded-lg">
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              priority
              className="object-cover"
            />
          </div>
        )}

        <div className="mb-2">
          <span className="inline-block rounded-full bg-ocean-light px-3 py-1 text-sm font-medium text-ocean">
            {event.category.replace("_", " & ")}
          </span>
          {event.isFree && (
            <span className="ml-2 inline-block rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-success">
              FREE
            </span>
          )}
        </div>

        <h1 className="mb-4 font-heading text-4xl font-bold">{event.name}</h1>

        <div className="mb-8 flex flex-wrap gap-6 text-slate-700">
          <div>
            <strong className="block text-xs uppercase text-slate-500">
              Date
            </strong>
            {formatDate(event.startDate)}
          </div>
          <div>
            <strong className="block text-xs uppercase text-slate-500">
              Time
            </strong>
            {formatTime(event.startDate)}
            {event.endDate && ` – ${formatTime(event.endDate)}`}
          </div>
          {event.venueName && (
            <div>
              <strong className="block text-xs uppercase text-slate-500">
                Venue
              </strong>
              {event.venueName}
            </div>
          )}
          <div>
            <strong className="block text-xs uppercase text-slate-500">
              Location
            </strong>
            {event.city}, {event.state}
          </div>
        </div>

        {!event.isFree && (event.priceMin || event.priceMax) && (
          <div className="mb-8 rounded-lg bg-slate-100 p-4">
            <strong className="text-sm text-slate-500">Price: </strong>
            {event.priceMin && event.priceMax
              ? `$${event.priceMin} – $${event.priceMax} ${event.currency}`
              : event.priceMin
                ? `From $${event.priceMin} ${event.currency}`
                : `Up to $${event.priceMax} ${event.currency}`}
          </div>
        )}

        {event.description && (
          <div className="prose max-w-none">
            <p className="whitespace-pre-line">{event.description}</p>
          </div>
        )}

        <div className="mt-10 flex gap-4">
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-coral px-6 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              Get tickets
            </a>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Event website
            </a>
          )}
        </div>
      </article>
    </>
  );
}
