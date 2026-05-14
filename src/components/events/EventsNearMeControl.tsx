"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, MapPinOff, Loader2, AlertCircle, X } from "lucide-react";
import {
  SUPPORTED_CITIES,
  useUserLocation,
  type SupportedCity,
} from "@/lib/location/useUserLocation";
import { NEAR_ME_DEFAULT_RADIUS_M } from "@/lib/events/queryFilters";

/**
 * EVE-230 — Near-me CTA + permission-denied fallback for /events.
 *
 * Different surface from the homepage Near-me button: this one writes the
 * radius filter (`near_me`, `lat`, `lng`, `max_radius_m`) into the events
 * query so the server-rendered page filters by distance. The homepage button
 * snaps to the nearest known city instead (legacy v1 behaviour).
 */
export function EventsNearMeControl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, location, requestGeolocation, setManualCity, clear } =
    useUserLocation();
  const [showDeniedPrompt, setShowDeniedPrompt] = useState(false);
  // Track whether near-me URL state should follow the resolved coords. Set
  // when the user explicitly activates the control (button click or manual
  // city pick); cleared on activate-off. We DON'T auto-activate from cached
  // localStorage on mount — the URL is the source of truth for filter state.
  const wantsNearMe = useRef(false);

  const nearMeActive = searchParams?.get("near_me") === "1";

  // Push the geolocated coords into the URL so the SSR filter picks them up.
  useEffect(() => {
    if (status !== "located" || !location) return;
    if (!wantsNearMe.current && !nearMeActive) return;
    if (nearMeActive) {
      const curLat = Number(searchParams?.get("lat"));
      const curLng = Number(searchParams?.get("lng"));
      if (
        Number.isFinite(curLat) &&
        Number.isFinite(curLng) &&
        Math.abs(curLat - location.lat) < 1e-4 &&
        Math.abs(curLng - location.lng) < 1e-4
      ) {
        return;
      }
    }
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.set("near_me", "1");
    next.set("lat", location.lat.toFixed(5));
    next.set("lng", location.lng.toFixed(5));
    if (!next.get("max_radius_m")) {
      next.set("max_radius_m", String(NEAR_ME_DEFAULT_RADIUS_M));
    }
    router.replace(`/events?${next.toString()}`, { scroll: false });
  }, [status, location, nearMeActive, searchParams, router]);

  // Surface the denied/unsupported fallback prompt automatically once the
  // browser tells us the user said no.
  useEffect(() => {
    if (status === "denied" || status === "unsupported" || status === "error") {
      setShowDeniedPrompt(true);
    }
  }, [status]);

  const onActivate = useCallback(() => {
    if (nearMeActive) {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.delete("near_me");
      next.delete("lat");
      next.delete("lng");
      next.delete("max_radius_m");
      wantsNearMe.current = false;
      clear();
      const qs = next.toString();
      router.replace(qs ? `/events?${qs}` : "/events", { scroll: false });
      return;
    }
    wantsNearMe.current = true;
    requestGeolocation();
  }, [nearMeActive, searchParams, router, requestGeolocation, clear]);

  const onPickCity = useCallback(
    (city: SupportedCity) => {
      wantsNearMe.current = true;
      setManualCity(city);
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.set("near_me", "1");
      next.set("lat", city.lat.toFixed(5));
      next.set("lng", city.lng.toFixed(5));
      if (!next.get("max_radius_m")) {
        next.set("max_radius_m", String(NEAR_ME_DEFAULT_RADIUS_M));
      }
      setShowDeniedPrompt(false);
      router.replace(`/events?${next.toString()}`, { scroll: false });
    },
    [setManualCity, searchParams, router],
  );

  const showAllHref = (() => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("near_me");
    next.delete("lat");
    next.delete("lng");
    next.delete("max_radius_m");
    const qs = next.toString();
    return qs ? `/events?${qs}` : "/events";
  })();

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onActivate}
        aria-pressed={nearMeActive}
        aria-busy={status === "locating"}
        aria-label={
          nearMeActive ? "Stop filtering by your location" : "Find events near me"
        }
        disabled={status === "locating"}
        className={buttonClasses(status, nearMeActive)}
      >
        <ButtonIcon status={status} active={nearMeActive} />
        <span className="font-body font-semibold">
          {labelFor(status, nearMeActive, location?.label)}
        </span>
      </button>

      {showDeniedPrompt && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-sm shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span
                className="material-symbols-outlined text-secondary text-[20px]"
                aria-hidden="true"
              >
                location_off
              </span>
              <div>
                <p className="font-body font-semibold text-on-surface">
                  {status === "unsupported"
                    ? "Your browser doesn't support location"
                    : status === "denied"
                      ? "Location access blocked"
                      : "Couldn't determine your location"}
                </p>
                <p className="mt-1 text-secondary font-body">
                  Pick a city manually or browse all upcoming events.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDeniedPrompt(false)}
              aria-label="Dismiss location prompt"
              className="rounded-full p-1 text-secondary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SUPPORTED_CITIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => onPickCity(c)}
                className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {c.label}
              </button>
            ))}
            <Link
              href={showAllHref}
              onClick={() => setShowDeniedPrompt(false)}
              className="ml-1 rounded-full px-3 py-1.5 font-body text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Show all events
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function buttonClasses(
  status: ReturnType<typeof useUserLocation>["status"],
  nearMeActive: boolean,
): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors w-fit";
  if (status === "locating") {
    return `${base} border-outline-variant bg-surface-container-lowest text-on-surface cursor-wait`;
  }
  if (nearMeActive) {
    return `${base} border-primary bg-primary text-on-primary hover:bg-primary/90`;
  }
  return `${base} border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low`;
}

function labelFor(
  status: ReturnType<typeof useUserLocation>["status"],
  nearMeActive: boolean,
  cityLabel?: string,
): string {
  if (status === "locating") return "Locating…";
  if (nearMeActive) {
    return cityLabel ? `Near ${cityLabel} · Clear` : "Near me · Clear";
  }
  return "Near me";
}

function ButtonIcon({
  status,
  active,
}: {
  status: ReturnType<typeof useUserLocation>["status"];
  active: boolean;
}) {
  if (status === "locating") {
    return <Loader2 size={16} className="animate-spin shrink-0" aria-hidden="true" />;
  }
  if (status === "error") {
    return <AlertCircle size={16} className="shrink-0" aria-hidden="true" />;
  }
  if (status === "denied" || status === "unsupported") {
    return <MapPinOff size={16} className="shrink-0" aria-hidden="true" />;
  }
  return (
    <MapPin
      size={16}
      className={`shrink-0 ${active ? "" : ""}`}
      aria-hidden="true"
    />
  );
}
