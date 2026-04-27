"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

interface EventFilterPillProps {
  eventName: string;
  eventSlug: string;
}

export function EventFilterPill({ eventName, eventSlug }: EventFilterPillProps) {
  const params = useSearchParams();

  const clearHref = useMemo(() => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.delete("eventSlug");
    next.delete("cursor");
    const qs = next.toString();
    return `/discussions${qs ? `?${qs}` : ""}`;
  }, [params]);

  return (
    <div
      className="flex flex-wrap items-center gap-2 bg-primary-container/15 border border-primary-container/40 rounded-xl px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <span
        className="material-symbols-outlined text-primary text-[18px]"
        aria-hidden="true"
      >
        filter_alt
      </span>
      <span className="font-body text-sm text-on-surface">
        Filtered to event:{" "}
        <Link
          href={`/events/${eventSlug}`}
          className="font-semibold text-primary hover:underline"
        >
          {eventName}
        </Link>
      </span>
      <Link
        href={clearHref}
        replace
        scroll={false}
        className="ml-auto inline-flex items-center gap-1 font-body text-xs font-semibold text-secondary hover:text-on-surface px-2 py-1 rounded-full hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Clear event filter"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          close
        </span>
        Clear
      </Link>
    </div>
  );
}
