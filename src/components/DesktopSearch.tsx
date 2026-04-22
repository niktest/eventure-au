"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DesktopSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/events?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="hidden md:flex flex-1 ml-6 max-w-md">
      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
          search
        </span>
        <label htmlFor="desktop-search" className="sr-only">Search events</label>
        <input
          id="desktop-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events..."
          className="w-full pl-10 pr-4 py-2 bg-surface-bright border border-secondary-container rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body text-sm text-on-surface"
        />
      </div>
    </form>
  );
}
