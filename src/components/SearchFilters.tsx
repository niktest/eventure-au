"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CATEGORIES = [
  "MUSIC",
  "FESTIVAL",
  "MARKETS",
  "SPORTS",
  "FAMILY",
  "NIGHTLIFE",
  "FOOD_DRINK",
  "ARTS",
  "COMEDY",
  "THEATRE",
  "OUTDOOR",
  "COMMUNITY",
] as const;

function formatCategory(cat: string): string {
  return cat
    .replace("_", " & ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/, "&");
}

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams?.get("category") ?? "";
  const currentQuery = searchParams?.get("q") ?? "";
  const currentDateFrom = searchParams?.get("dateFrom") ?? "";
  const currentDateTo = searchParams?.get("dateTo") ?? "";
  const currentFreeOnly = searchParams?.get("free") === "1";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/events?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="mb-8 space-y-4">
      {/* Text search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-3.5 text-secondary text-[20px]">
          search
        </span>
        <input
          type="search"
          placeholder="Search events, artists, venues..."
          defaultValue={currentQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ q: (e.target as HTMLInputElement).value || null });
            }
          }}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 pl-10 font-body text-base text-on-surface placeholder:text-secondary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Date range and free toggle */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-body font-semibold text-on-surface">From</span>
          <input
            type="date"
            defaultValue={currentDateFrom}
            onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-body font-semibold text-on-surface">To</span>
          <input
            type="date"
            defaultValue={currentDateTo}
            onChange={(e) => updateParams({ dateTo: e.target.value || null })}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            checked={currentFreeOnly}
            onChange={(e) =>
              updateParams({ free: e.target.checked ? "1" : null })
            }
            className="rounded accent-primary"
          />
          <span className="font-body font-semibold text-on-surface">Free only</span>
        </label>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParams({ category: null })}
          className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors ${
            !currentCategory
              ? "bg-primary text-on-primary"
              : "bg-surface-container-low text-on-surface hover:bg-surface-container"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              updateParams({
                category:
                  currentCategory.toUpperCase() === cat
                    ? null
                    : cat.toLowerCase(),
              })
            }
            className={`rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors ${
              currentCategory.toUpperCase() === cat
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container"
            }`}
          >
            {formatCategory(cat)}
          </button>
        ))}
      </div>
    </div>
  );
}
