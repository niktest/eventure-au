import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/types/event";
import { CategoryIcon } from "./CategoryIcon";

function formatCategory(cat: string): string {
  return cat
    .replace("_", " & ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/, "&");
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="card-shine group flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image with overlay gradient */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-slate-100">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            placeholder="empty"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-ocean-light to-coral-light">
            <svg className="h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Date badge */}
        <div className="absolute top-3 left-3 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-bold leading-tight text-coral">
            {new Date(event.startDate).toLocaleDateString("en-AU", { day: "numeric" })}
          </p>
          <p className="text-[10px] font-semibold uppercase leading-tight text-slate-500">
            {new Date(event.startDate).toLocaleDateString("en-AU", { month: "short" })}
          </p>
        </div>
        {/* Price tag */}
        {event.isFree ? (
          <span className="absolute top-3 right-3 rounded-full bg-success px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            FREE
          </span>
        ) : event.priceMin != null ? (
          <span className="absolute top-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm">
            From ${event.priceMin.toFixed(0)}
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <CategoryIcon category={event.category} size="sm" />
          <span className="text-xs font-medium text-slate-500">
            {formatCategory(event.category)}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-2 font-heading text-base font-semibold text-slate-900 transition-colors group-hover:text-coral">
          {event.name}
        </h3>
        <div className="mt-auto pt-2">
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {formatDate(event.startDate)}
          </p>
          {event.venueName && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="truncate">{event.venueName}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
