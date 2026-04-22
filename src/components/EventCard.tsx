import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/types/event";

function formatMonth(d: Date): string {
  return new Date(d).toLocaleDateString("en-AU", { month: "short" });
}

function formatDay(d: Date): string {
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric" });
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group bg-surface-bright rounded-xl overflow-hidden shadow-sm border border-surface-container-high flex flex-col card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Image with 16:9 aspect ratio */}
      <div className="relative w-full aspect-video overflow-hidden">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            placeholder="empty"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-dim">
            <span className="material-symbols-outlined text-4xl text-secondary">
              calendar_month
            </span>
          </div>
        )}

        {/* Coral date badge — top right */}
        <div className="absolute top-3 right-3 bg-primary text-on-primary rounded-full px-3 py-1 flex flex-col items-center justify-center shadow-md">
          <span className="text-[10px] uppercase tracking-wider leading-none font-semibold">
            {formatMonth(event.startDate)}
          </span>
          <span className="text-lg leading-tight font-bold">
            {formatDay(event.startDate)}
          </span>
        </div>

        {/* Price / Free badge */}
        {event.isFree ? (
          <span className="absolute top-3 left-3 bg-surface-bright/90 backdrop-blur text-success rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
            FREE
          </span>
        ) : event.priceMin != null ? (
          <span className="absolute top-3 left-3 bg-surface-bright/90 backdrop-blur text-on-surface rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
            From ${event.priceMin.toFixed(0)}
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="font-heading text-xl font-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary-container transition-colors">
          {event.name}
        </h3>

        {event.description && (
          <p className="font-body text-sm text-secondary mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1 text-secondary">
          {event.venueName && (
            <p className="flex items-center gap-1 text-sm">
              <span className="material-symbols-outlined text-[16px]">
                location_on
              </span>
              <span className="truncate">
                {event.venueName}, {event.city}
              </span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
