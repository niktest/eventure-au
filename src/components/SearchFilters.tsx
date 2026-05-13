"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { EventSearchAutocomplete } from "./EventSearchAutocomplete";
import { NearMeSortToggle } from "./NearMeSortToggle";

function formatCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace("_", " & ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/, "&");
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function toListParam(list: string[]): string | null {
  return list.length > 0 ? list.join(",") : null;
}

type RadioOption = { value: string; label: string };

function PillGroup({
  ariaLabel,
  current,
  options,
  onChange,
}: {
  ariaLabel: string;
  /** "" represents the "Any" state. */
  current: string;
  options: RadioOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={current === ""}
        onClick={() => onChange("")}
        className={pillClass(current === "")}
      >
        Any
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={current === opt.value}
          onClick={() => onChange(current === opt.value ? "" : opt.value)}
          className={pillClass(current === opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function pillClass(active: boolean): string {
  return [
    "rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    active
      ? "bg-primary text-on-primary"
      : "bg-surface-container-low text-on-surface hover:bg-surface-container",
  ].join(" ");
}

export function SearchFilters({
  availableCategories,
}: {
  /** Uppercase EventCategory enums, pre-ordered by popularity desc (EVE-183). */
  availableCategories: readonly string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `loading.tsx` doesn't fire on same-segment search-param changes, so we
  // surface the SSR roundtrip after a filter click via `isPending` —
  // dimmed controls + thin top progress bar (board feedback EVE-164).
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams?.get("q") ?? "";
  const currentDateFrom = searchParams?.get("dateFrom") ?? "";
  const currentDateTo = searchParams?.get("dateTo") ?? "";
  const currentLocation = searchParams?.get("location") ?? "";
  // Back-compat: legacy `free=1` reads as price=free.
  const currentPrice =
    searchParams?.get("price") ??
    (searchParams?.get("free") === "1" ? "free" : "");
  const currentSetting = searchParams?.get("setting") ?? "";
  const currentAge = searchParams?.get("age") ?? "";

  const selectedCategories = useMemo(
    () => parseList(searchParams?.get("category") ?? null),
    [searchParams],
  );

  // Keep selected categories visible even if not in the popular set, so
  // users can always deselect (e.g. deep links / homepage-only slugs).
  const categoryPills = useMemo(() => {
    const fromDb = availableCategories.map((c) => c.toLowerCase());
    const extras = selectedCategories.filter((s) => !fromDb.includes(s));
    return [...fromDb, ...extras];
  }, [availableCategories, selectedCategories]);

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
      // Always drop legacy `free` once we touch filters — `price` is the
      // canonical param going forward.
      if ("price" in updates) params.delete("free");
      startTransition(() => {
        router.push(`/events?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const toggleCategory = useCallback(
    (slug: string) => {
      const lower = slug.toLowerCase();
      const next = selectedCategories.includes(lower)
        ? selectedCategories.filter((s) => s !== lower)
        : [...selectedCategories, lower];
      updateParams({ category: toListParam(next) });
    },
    [selectedCategories, updateParams],
  );

  const hasFilters = Boolean(
    currentQuery ||
      currentDateFrom ||
      currentDateTo ||
      currentLocation ||
      currentPrice ||
      currentSetting ||
      currentAge ||
      selectedCategories.length > 0,
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push("/events");
    });
  }, [router]);

  return (
    <div
      data-pending={isPending ? "1" : undefined}
      className={`mb-8 space-y-4 transition-opacity ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      {isPending && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading events"
          className="fixed top-0 inset-x-0 h-0.5 bg-primary/30 z-50 overflow-hidden"
        >
          <div className="h-full w-1/3 bg-primary loading-bar" />
        </div>
      )}
      {/* Text search with live autocomplete; submit preserves URL filter state */}
      <div data-primary-search>
        <EventSearchAutocomplete
          inputId="event-search"
          placeholder="Search events, artists, venues..."
          initialQuery={currentQuery}
          wrapperClassName="relative w-full"
          iconClassName="material-symbols-outlined absolute left-3 top-3.5 text-secondary text-[20px] pointer-events-none"
          inputClassName="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 pl-10 font-body text-base text-on-surface placeholder:text-secondary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          onSubmit={(q) => updateParams({ q: q || null })}
        />
      </div>

      {/* Date range + location */}
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
        <label className="flex flex-col text-sm flex-1 min-w-[180px]">
          <span className="mb-1 font-body font-semibold text-on-surface">
            City or suburb
          </span>
          <input
            type="text"
            inputMode="search"
            placeholder="e.g. Surfers Paradise"
            defaultValue={currentLocation}
            onBlur={(e) =>
              updateParams({ location: e.target.value.trim() || null })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateParams({
                  location: (e.target as HTMLInputElement).value.trim() || null,
                });
              }
            }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* "Near me" sort — explicit geolocation opt-in (EVE-209). */}
      <div className="flex flex-wrap items-center gap-2">
        <NearMeSortToggle />
      </div>

      {/* Structured filters: price / setting / age */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-secondary">
            Price
          </p>
          <PillGroup
            ariaLabel="Price band"
            current={currentPrice}
            options={[
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ]}
            onChange={(v) => updateParams({ price: v || null })}
          />
        </div>
        <div>
          <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-secondary">
            Setting
          </p>
          <PillGroup
            ariaLabel="Indoor or outdoor"
            current={currentSetting}
            options={[
              { value: "indoor", label: "Indoor" },
              { value: "outdoor", label: "Outdoor" },
            ]}
            onChange={(v) => updateParams({ setting: v || null })}
          />
        </div>
        <div>
          <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-secondary">
            Age
          </p>
          <PillGroup
            ariaLabel="Age suitability"
            current={currentAge}
            options={[
              { value: "family", label: "Family-friendly" },
              { value: "adults", label: "18+" },
            ]}
            onChange={(v) => updateParams({ age: v || null })}
          />
        </div>
      </div>

      {/* Category pills — multi-select */}
      <div>
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-secondary">
          Category
        </p>
        <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            aria-pressed={selectedCategories.length === 0}
            className={pillClass(selectedCategories.length === 0)}
          >
            All
          </button>
          {categoryPills.map((cat) => {
            const isSelected = selectedCategories.includes(cat.toLowerCase());
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                aria-pressed={isSelected}
                className={pillClass(isSelected)}
              >
                {formatCategory(cat)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
