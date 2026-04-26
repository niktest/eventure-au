import Link from "next/link";
import { FallbackImage } from "@/components/FallbackImage";
import type { LinkedEventSummary } from "@/types/discussions";

function formatDateRange(start: string, end: string | null): string {
  const startDate = new Date(start);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  const startLabel = startDate.toLocaleDateString("en-AU", opts);
  if (!end) return startLabel;
  const endDate = new Date(end);
  if (endDate.toDateString() === startDate.toDateString()) return startLabel;
  return `${startLabel} – ${endDate.toLocaleDateString("en-AU", opts)}`;
}

export function LinkedEventCard({ event }: { event: LinkedEventSummary }) {
  return (
    <Link
      href={`/events/${event.slug}?from=discussions`}
      className="flex items-stretch gap-3 bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative w-24 sm:w-32 shrink-0 bg-surface-container overflow-hidden">
        {event.imageUrl ? (
          <FallbackImage
            src={event.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container to-primary" />
        )}
      </div>
      <div className="flex flex-col justify-center py-3 pr-4 min-w-0">
        <div className="text-xs font-body font-semibold text-primary uppercase tracking-wide mb-1">
          🎫 Linked event
        </div>
        <div className="font-heading font-bold text-on-surface truncate">
          {event.name}
        </div>
        <div className="font-body text-sm text-secondary truncate">
          {formatDateRange(event.startDate, event.endDate)}
          {event.venueName ? ` · ${event.venueName}` : ""}
          {!event.venueName ? ` · ${event.city}` : ""}
        </div>
        <div className="mt-2 inline-flex items-center gap-1 font-body text-xs font-semibold text-primary">
          View event
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}
