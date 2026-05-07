"use client";

import { EventSearchAutocomplete } from "./EventSearchAutocomplete";

export function DesktopSearch() {
  return (
    <div className="hidden md:flex flex-1 ml-6 max-w-md">
      <EventSearchAutocomplete
        inputId="desktop-search"
        placeholder="Search events..."
      />
    </div>
  );
}
