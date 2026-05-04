"use client";

import { useEffect, useRef } from "react";
import { SUPPORTED_CITIES, type SupportedCity } from "@/lib/location/useUserLocation";

type CityPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (city: SupportedCity) => void;
  onTryGeo: () => void;
};

/**
 * Phase 1 city-picker fallback per EVE-126 §4.3.
 * Mobile: bottom sheet. Tablet+: anchored popover (visually similar layout).
 * Sydney / Melbourne shown as "coming soon" placeholders to set expectations.
 */
export function CityPicker({ open, onClose, onSelect, onTryGeo }: CityPickerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-picker-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-surface-1 p-6 text-on-dark-strong shadow-xl md:rounded-2xl"
      >
        <h2
          id="city-picker-heading"
          className="font-heading text-xl font-bold mb-4"
        >
          Choose a city
        </h2>

        <ul className="flex flex-col gap-2 mb-4">
          {SUPPORTED_CITIES.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                className="w-full text-left rounded-lg border border-surface-3 bg-surface-2 px-4 py-3 font-body font-semibold hover:border-neon-coral hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow transition-colors"
              >
                {c.label}
              </button>
            </li>
          ))}
          {[
            { slug: "sydney", label: "Sydney · coming soon" },
            { slug: "melbourne", label: "Melbourne · coming soon" },
          ].map((p) => (
            <li key={p.slug}>
              <span
                aria-disabled="true"
                className="block w-full rounded-lg border border-surface-3 bg-surface-1 px-4 py-3 font-body text-on-dark-subtle"
              >
                {p.label}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            onClose();
            onTryGeo();
          }}
          className="w-full rounded-lg px-4 py-2 font-body text-sm font-semibold text-neon-coral hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow"
        >
          Detect my location instead
        </button>
      </div>
    </div>
  );
}
