"use client";

import { EventSearchAutocomplete } from "./EventSearchAutocomplete";
import { usePrimarySearchVisible } from "@/hooks/usePrimarySearchVisible";

export function DesktopSearch() {
  const primaryVisible = usePrimarySearchVisible();

  return (
    <div
      aria-hidden={primaryVisible ? "true" : undefined}
      className={
        "hidden md:flex flex-1 ml-6 max-w-md transition-opacity duration-200 " +
        (primaryVisible ? "opacity-0 pointer-events-none" : "opacity-100")
      }
    >
      <EventSearchAutocomplete
        inputId="desktop-search"
        placeholder="Search events..."
      />
    </div>
  );
}
