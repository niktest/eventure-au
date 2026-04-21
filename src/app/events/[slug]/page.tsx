import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eventJsonLd } from "@/lib/seo/schema";

export const revalidate = 3600;

export async function generateStaticParams() {
  const events = await prisma.event.findMany({
    where: { status: "published" },
    select: { slug: true },
    take: 500,
  });
  return events.map((e) => ({ slug: e.slug }));
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
          <img
            src={event.imageUrl}
            alt={event.name}
            className="mb-8 h-80 w-full rounded-lg object-cover"
          />
        )}

        <div className="mb-2">
          <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {event.category.replace("_", " & ")}
          </span>
          {event.isFree && (
            <span className="ml-2 inline-block rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
              FREE
            </span>
          )}
        </div>

        <h1 className="mb-4 text-4xl font-bold">{event.name}</h1>

        <div className="mb-8 flex flex-wrap gap-6 text-gray-600">
          <div>
            <strong className="block text-xs uppercase text-gray-400">
              Date
            </strong>
            {formatDate(event.startDate)}
          </div>
          <div>
            <strong className="block text-xs uppercase text-gray-400">
              Time
            </strong>
            {formatTime(event.startDate)}
            {event.endDate && ` – ${formatTime(event.endDate)}`}
          </div>
          {event.venueName && (
            <div>
              <strong className="block text-xs uppercase text-gray-400">
                Venue
              </strong>
              {event.venueName}
            </div>
          )}
          <div>
            <strong className="block text-xs uppercase text-gray-400">
              Location
            </strong>
            {event.city}, {event.state}
          </div>
        </div>

        {!event.isFree && (event.priceMin || event.priceMax) && (
          <div className="mb-8 rounded-lg bg-gray-50 p-4">
            <strong className="text-sm text-gray-500">Price: </strong>
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
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Get tickets
            </a>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Event website
            </a>
          )}
        </div>
      </article>
    </>
  );
}
