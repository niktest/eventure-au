"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ThreadSort } from "@/types/discussions";

interface SortAndFiltersProps {
  sort: ThreadSort;
  hasEvent: boolean;
  mine: boolean;
  isSignedIn: boolean;
}

const SORTS: Array<{ value: ThreadSort; label: string; icon: string }> = [
  { value: "hot", label: "Hot", icon: "local_fire_department" },
  { value: "new", label: "New", icon: "schedule" },
  { value: "top", label: "Top", icon: "trending_up" },
];

interface ControlsProps {
  sort: ThreadSort;
  hasEvent: boolean;
  mine: boolean;
  isSignedIn: boolean;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onHasEventChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMineChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Controls({
  sort,
  hasEvent,
  mine,
  isSignedIn,
  onSortChange,
  onHasEventChange,
  onMineChange,
}: ControlsProps) {
  const sortLabel = useMemo(
    () => SORTS.find((s) => s.value === sort)?.icon ?? "local_fire_department",
    [sort]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative inline-flex items-center">
        <span
          className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none"
          aria-hidden="true"
        >
          {sortLabel}
        </span>
        <label htmlFor="thread-sort" className="sr-only">
          Sort threads
        </label>
        <select
          id="thread-sort"
          value={sort}
          onChange={onSortChange}
          className="appearance-none bg-surface-container-low border border-outline-variant rounded-full pl-9 pr-9 py-2 font-body text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span
          className="material-symbols-outlined text-secondary text-[18px] absolute right-2 pointer-events-none"
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>

      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={hasEvent}
          onChange={onHasEventChange}
        />
        <span className="rounded-full px-3 py-1.5 font-body text-sm font-semibold border border-outline-variant text-on-surface bg-surface-container-lowest peer-checked:bg-primary peer-checked:text-on-primary peer-checked:border-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2">
          Has event
        </span>
      </label>

      {isSignedIn && (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={mine}
            onChange={onMineChange}
          />
          <span className="rounded-full px-3 py-1.5 font-body text-sm font-semibold border border-outline-variant text-on-surface bg-surface-container-lowest peer-checked:bg-primary peer-checked:text-on-primary peer-checked:border-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2">
            Mine
          </span>
        </label>
      )}
    </div>
  );
}

export function SortAndFilters({
  sort,
  hasEvent,
  mine,
  isSignedIn,
}: SortAndFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params?.toString() ?? "");
      mutate(next);
      next.delete("cursor");
      const qs = next.toString();
      router.replace(`/discussions${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router]
  );

  const onSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as ThreadSort;
      update((next) => next.set("sort", value));
    },
    [update]
  );

  const onHasEventChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      update((next) => {
        if (e.target.checked) next.set("hasEvent", "1");
        else next.delete("hasEvent");
      });
    },
    [update]
  );

  const onMineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      update((next) => {
        if (e.target.checked) next.set("mine", "1");
        else next.delete("mine");
      });
    },
    [update]
  );

  const sortLabel =
    SORTS.find((s) => s.value === sort)?.label ?? "Hot";
  const activeFilterCount =
    (hasEvent ? 1 : 0) + (mine && isSignedIn ? 1 : 0);

  // Close sheet on Escape; lock body scroll while open
  useEffect(() => {
    if (!sheetOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  const controlProps = {
    sort,
    hasEvent,
    mine,
    isSignedIn,
    onSortChange,
    onHasEventChange,
    onMineChange,
  };

  return (
    <>
      {/* Desktop: inline controls */}
      <div className="hidden md:block">
        <Controls {...controlProps} />
      </div>

      {/* Mobile: sheet trigger */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 font-body text-sm font-semibold text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            tune
          </span>
          <span>Sort &amp; Filter</span>
          <span className="text-secondary font-normal">· {sortLabel}</span>
          {activeFilterCount > 0 && (
            <span
              className="bg-primary text-on-primary rounded-full px-2 py-0.5 text-xs font-bold"
              aria-label={`${activeFilterCount} filters active`}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {sheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Sort and filter threads"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-t-2xl shadow-xl px-5 pt-3 pb-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pb-2">
              <span
                className="block w-10 h-1.5 bg-outline-variant rounded-full"
                aria-hidden="true"
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-on-surface">
                Sort &amp; Filter
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-2 -mr-2 text-secondary hover:text-on-surface rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>
            <Controls {...controlProps} />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 w-full bg-primary text-on-primary font-body text-sm font-semibold py-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
