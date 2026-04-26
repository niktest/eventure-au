import Link from "next/link";
import type { TrendingEvent } from "@/types/discussions";

export function TrendingEventsRail({ events }: { events: TrendingEvent[] }) {
  if (events.length === 0) return null;
  return (
    <aside className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5">
      <h2 className="font-heading text-base font-bold text-on-surface mb-3">
        Trending events
      </h2>
      <ul className="space-y-2.5">
        {events.map((event) => (
          <li key={event.slug}>
            <Link
              href={`/events/${event.slug}?from=discussions`}
              className="flex items-baseline justify-between gap-3 font-body text-sm hover:text-primary transition-colors group"
            >
              <span className="font-semibold text-on-surface group-hover:text-primary truncate">
                {event.name}
              </span>
              <span className="text-secondary text-xs whitespace-nowrap">
                {event.threadCount} thread{event.threadCount === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
