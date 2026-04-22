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

  const currentCategory = searchParams.get("category") ?? "";
  const currentQuery = searchParams.get("q") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";
  const currentFreeOnly = searchParams.get("free") === "1";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
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
        <input
          type="search"
          placeholder="Search events..."
          defaultValue={currentQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ q: (e.target as HTMLInputElement).value || null });
            }
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pl-10 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
        <svg
          className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Date range and free toggle */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-slate-600">From</span>
          <input
            type="date"
            defaultValue={currentDateFrom}
            onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-slate-600">To</span>
          <input
            type="date"
            defaultValue={currentDateTo}
            onChange={(e) => updateParams({ dateTo: e.target.value || null })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
          />
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={currentFreeOnly}
            onChange={(e) =>
              updateParams({ free: e.target.checked ? "1" : null })
            }
            className="rounded accent-coral"
          />
          <span className="font-medium text-slate-600">Free only</span>
        </label>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParams({ category: null })}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            !currentCategory
              ? "bg-coral text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              currentCategory.toUpperCase() === cat
                ? "bg-coral text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {formatCategory(cat)}
          </button>
        ))}
      </div>
    </div>
  );
}
