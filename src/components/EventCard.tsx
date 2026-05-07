import Link from "next/link";
import type { EventCardData } from "@/lib/events/eventCardSelect";
import {
  EventCardImage,
  EventCardImagePlaceholder,
} from "./EventCardImage";

function formatMonth(d: Date): string {
  return new Date(d).toLocaleDateString("en-AU", { month: "short" });
}

function formatDay(d: Date): string {
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric" });
}

type EventCardVariant = "default" | "homepage";

export function EventCard({
  event,
  variant = "default",
}: {
  event: EventCardData;
  variant?: EventCardVariant;
}) {
  const hoverClass =
    variant === "homepage"
      ? "hover:-translate-y-1 hover:border-neon-coral hover:shadow-glow-coral transition-all duration-300"
      : "card-hover";
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`group bg-surface-bright rounded-xl overflow-hidden shadow-sm border border-surface-container-high flex flex-col min-w-0 ${hoverClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
    >
      {/* Image with 16:9 aspect ratio */}
      <div className="relative w-full aspect-video overflow-hidden">
        {event.imageUrl ? (
          <EventCardImage src={event.imageUrl} alt={event.name} />
        ) : (
          <EventCardImagePlaceholder />
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

        <div className="mt-auto flex items-center gap-1 text-secondary min-w-0">
          {event.venueName && (
            <p className="flex items-center gap-1 text-sm min-w-0">
              <span className="material-symbols-outlined text-[16px] shrink-0">
                location_on
              </span>
              <span className="truncate min-w-0">
                {event.venueName}, {event.city}
              </span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
