"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SUPPORTED_CITIES,
  type SupportedCity,
} from "@/lib/location/cities";
import type { CitySource } from "@/lib/location/cityCookie";
import { writeCityCookie } from "@/lib/location/useUserLocation";

type HeaderCityPickerProps = {
  initialSlug: string;
  initialLabel: string;
  initialSource: CitySource | "default";
};

/**
 * Header affordance for EVE-209 acceptance:
 *   - Always shows the current city.
 *   - Click → dropdown of supported cities to switch.
 *   - Persists the choice in the festlio_city cookie and refreshes the
 *     server tree so the home + /events lists re-scope.
 *
 * Renders the IP-detected city with a "From your location" hint so users
 * who land on the wrong city can correct it without hunting through menus.
 */
export function HeaderCityPicker({
  initialSlug,
  initialLabel,
  initialSource,
}: HeaderCityPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [currentLabel, setCurrentLabel] = useState(initialLabel);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectCity(city: SupportedCity) {
    writeCityCookie(city.slug, "manual");
    setCurrentSlug(city.slug);
    setCurrentLabel(city.label);
    setOpen(false);
    // Refresh server components so the home + /events lists re-render with
    // the new city filter applied.
    router.refresh();
  }

  const showDetectedHint = initialSource === "ip" && currentSlug === initialSlug;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Change city — currently ${currentLabel}`}
        aria-describedby={open ? "header-city-picker-disclosure" : undefined}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        data-testid="header-city-picker-trigger"
      >
        <span
          className="material-symbols-outlined text-[18px] text-primary"
          aria-hidden="true"
        >
          location_on
        </span>
        <span>{currentLabel}</span>
        <span
          className="material-symbols-outlined text-[16px] text-secondary"
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose city"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-surface-container-high bg-white shadow-lg py-2 z-50"
          data-testid="header-city-picker-menu"
        >
          {showDetectedHint && (
            <p className="px-4 pb-2 text-xs font-body text-secondary">
              Detected from your location. Not right?
            </p>
          )}
          <ul className="flex flex-col">
            {SUPPORTED_CITIES.map((c) => {
              const isCurrent = c.slug === currentSlug;
              const isLive = c.status === "live";
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    disabled={!isLive}
                    onClick={() => selectCity(c)}
                    className={
                      "w-full flex items-center justify-between px-4 py-2 font-body text-sm text-left transition-colors " +
                      (isCurrent
                        ? "bg-primary-container/10 text-primary font-semibold"
                        : isLive
                          ? "text-on-surface hover:bg-surface-container-low"
                          : "text-secondary/70 cursor-not-allowed")
                    }
                  >
                    <span>{c.label}</span>
                    {!isLive && (
                      <span className="text-xs font-semibold text-secondary">
                        coming soon
                      </span>
                    )}
                    {isCurrent && (
                      <span
                        className="material-symbols-outlined text-[18px]"
                        aria-hidden="true"
                      >
                        check
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p
            id="header-city-picker-disclosure"
            className="border-t border-surface-container-high mt-2 px-4 pt-2 text-[11px] font-body text-secondary"
          >
            We use your approximate location (from your IP) only to suggest a
            nearby city. We don&rsquo;t use it for advertising or cross-site
            tracking. You can change or clear this any time.{" "}
            <a
              href="/privacy#location"
              className="underline hover:text-primary"
            >
              Learn more
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
