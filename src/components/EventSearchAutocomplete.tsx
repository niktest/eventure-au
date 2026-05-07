"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkedEventSummary } from "@/types/discussions";

interface EventSearchAutocompleteProps {
  placeholder?: string;
  inputId?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  iconClassName?: string;
  panelClassName?: string;
  initialQuery?: string;
  autoFocus?: boolean;
  /** Called after the user picks a result or "see all results". Useful for closing a parent panel. */
  onAfterNavigate?: () => void;
  /** Override the full-search submit (Enter with no highlight, or "see all results"). Default: navigate to /events?q=… */
  onSubmit?: (query: string) => void;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

export function EventSearchAutocomplete({
  placeholder = "Search events, venues…",
  inputId,
  inputClassName,
  wrapperClassName,
  iconClassName,
  panelClassName,
  initialQuery = "",
  autoFocus = false,
  onAfterNavigate,
  onSubmit,
}: EventSearchAutocompleteProps) {
  const router = useRouter();
  const generatedId = useId();
  const id = inputId ?? `event-search-${generatedId}`;
  const listboxId = `${id}-listbox`;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<LinkedEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const showPanel = open && trimmed.length >= MIN_QUERY;
  // Total navigable rows = results + 1 ("see all results")
  const seeAllIndex = results.length;
  const navigableCount = results.length + (results.length > 0 ? 1 : 0);

  const submitFullSearch = useCallback(
    (q: string) => {
      const v = q.trim();
      if (!v) return;
      if (onSubmit) {
        onSubmit(v);
      } else {
        router.push(`/events?q=${encodeURIComponent(v)}`);
      }
      setOpen(false);
      onAfterNavigate?.();
    },
    [onAfterNavigate, onSubmit, router]
  );

  const goToEvent = useCallback(
    (event: LinkedEventSummary) => {
      router.push(`/events/${event.slug}`);
      setOpen(false);
      onAfterNavigate?.();
    },
    [onAfterNavigate, router]
  );

  // Debounced fetch with AbortController. Stale responses are dropped.
  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setHighlight(-1);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/events/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data?.events) ? data.events : []);
        setHighlight(-1);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [trimmed]);

  // Click outside closes panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (e.key === "Enter") {
      if (showPanel && highlight >= 0 && highlight < results.length) {
        e.preventDefault();
        goToEvent(results[highlight]);
      } else if (showPanel && highlight === seeAllIndex && results.length > 0) {
        e.preventDefault();
        submitFullSearch(trimmed);
      } else if (trimmed.length > 0) {
        e.preventDefault();
        submitFullSearch(trimmed);
      }
      return;
    }
    if (!showPanel || navigableCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % navigableCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? navigableCount - 1 : h - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(navigableCount - 1);
    }
  };

  const activeOptionId =
    showPanel && highlight >= 0 ? `${id}-opt-${highlight}` : undefined;

  return (
    <div
      ref={wrapperRef}
      className={wrapperClassName ?? "relative w-full"}
      role="combobox"
      aria-expanded={showPanel}
      aria-haspopup="listbox"
      aria-controls={listboxId}
      aria-owns={listboxId}
    >
      <span
        className={
          iconClassName ??
          "material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px] pointer-events-none"
        }
        aria-hidden="true"
      >
        search
      </span>
      <label htmlFor={id} className="sr-only">
        Search events
      </label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (trimmed.length >= MIN_QUERY) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        className={
          inputClassName ??
          "w-full pl-10 pr-4 py-2 bg-surface-bright border border-secondary-container rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body text-sm text-on-surface"
        }
      />

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Event search results"
          className={
            panelClassName ??
            "absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          }
        >
          {loading && results.length === 0 ? (
            <div className="p-3 font-body text-sm text-secondary" role="status">
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 font-body text-sm text-secondary">
              No events match &ldquo;{trimmed}&rdquo;.{" "}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submitFullSearch(trimmed)}
                className="text-primary font-semibold underline-offset-2 hover:underline"
              >
                Try the full search
              </button>
            </div>
          ) : (
            <>
              <ul className="py-1">
                {results.map((event, idx) => {
                  const isActive = idx === highlight;
                  return (
                    <li
                      key={event.id}
                      id={`${id}-opt-${idx}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setHighlight(idx)}
                        onClick={() => goToEvent(event)}
                        className={
                          "w-full text-left flex items-center gap-3 px-3 py-2 transition-colors " +
                          (isActive
                            ? "bg-primary-container/15"
                            : "hover:bg-surface-container-low")
                        }
                      >
                        <span
                          className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0"
                          aria-hidden="true"
                        >
                          event
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-body text-sm font-semibold text-on-surface truncate">
                            {event.name}
                          </span>
                          <span className="block font-body text-xs text-secondary truncate">
                            {formatDate(event.startDate)}
                            {event.venueName
                              ? ` · ${event.venueName}`
                              : event.city
                                ? ` · ${event.city}`
                                : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-outline-variant">
                <button
                  type="button"
                  id={`${id}-opt-${seeAllIndex}`}
                  role="option"
                  aria-selected={highlight === seeAllIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(seeAllIndex)}
                  onClick={() => submitFullSearch(trimmed)}
                  className={
                    "w-full text-left px-3 py-2 font-body text-sm font-semibold text-primary transition-colors " +
                    (highlight === seeAllIndex
                      ? "bg-primary-container/15"
                      : "hover:bg-surface-container-low")
                  }
                >
                  See all results for &ldquo;{trimmed}&rdquo;
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
