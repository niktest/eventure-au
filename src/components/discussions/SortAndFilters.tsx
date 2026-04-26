"use client";

import { useCallback, useMemo } from "react";
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

export function SortAndFilters({
  sort,
  hasEvent,
  mine,
  isSignedIn,
}: SortAndFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();

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
          onChange={(e) =>
            update((next) => {
              if (e.target.checked) next.set("hasEvent", "1");
              else next.delete("hasEvent");
            })
          }
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
            onChange={(e) =>
              update((next) => {
                if (e.target.checked) next.set("mine", "1");
                else next.delete("mine");
              })
            }
          />
          <span className="rounded-full px-3 py-1.5 font-body text-sm font-semibold border border-outline-variant text-on-surface bg-surface-container-lowest peer-checked:bg-primary peer-checked:text-on-primary peer-checked:border-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2">
            Mine
          </span>
        </label>
      )}
    </div>
  );
}
