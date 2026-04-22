import Link from "next/link";
import type { Event } from "@/types/event";

function formatCategory(cat: string): string {
  return cat
    .replace("_", " & ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/, "&");
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt={event.name}
          className="mb-3 h-48 w-full rounded-md object-cover"
        />
      )}
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-block rounded-full bg-ocean-light px-2 py-0.5 text-xs font-medium text-ocean">
          {formatCategory(event.category)}
        </span>
        {event.isFree && (
          <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-success">
            FREE
          </span>
        )}
      </div>
      <h3 className="font-heading font-semibold text-slate-900 group-hover:text-coral">
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
      {event.venueName && (
        <p className="text-sm text-slate-500">{event.venueName}</p>
      )}
      {!event.isFree && event.priceMin != null && (
        <p className="mt-1 text-sm font-medium text-slate-700">
          From ${event.priceMin.toFixed(0)} {event.currency}
        </p>
      )}
    </Link>
  );
}
