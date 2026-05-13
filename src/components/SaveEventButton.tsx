"use client";

import { useSavedEvents } from "@/lib/saved/useSavedEvents";

type Variant = "card" | "detail";

export function SaveEventButton({
  eventId,
  variant = "card",
  eventName,
}: {
  eventId: string;
  variant?: Variant;
  eventName?: string;
}) {
  const { ready, isSaved, toggle } = useSavedEvents();
  const saved = ready && isSaved(eventId);

  const onClick = (e: React.MouseEvent) => {
    // EventCard wraps the whole tile in a <Link>; the heart sits over the
    // image so clicks must not navigate to the detail page.
    e.preventDefault();
    e.stopPropagation();
    toggle(eventId);
  };

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${eventName ?? "event"}` : `Save ${eventName ?? "event"}`}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-bright/90 backdrop-blur shadow-md hover:scale-110 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          className={`material-symbols-outlined text-[22px] transition-colors ${
            saved ? "text-primary" : "text-on-surface-variant"
          }`}
          style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
          aria-hidden="true"
        >
          favorite
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Unsave event" : "Save event"}
      className={`w-full rounded-full py-4 font-heading text-lg font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
        saved
          ? "bg-primary text-on-primary hover:shadow-lg hover:-translate-y-1"
          : "bg-surface-container-low text-on-surface border border-outline-variant hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      <span
        className="material-symbols-outlined text-[22px]"
        style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
        aria-hidden="true"
      >
        favorite
      </span>
      {saved ? "Saved" : "Save event"}
    </button>
  );
}
