"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Loader2, AlertCircle } from "lucide-react";

/**
 * "Near me" sort toggle for the /events filter bar (EVE-209).
 *
 * Triggers the browser geolocation prompt only on click — never on page
 * load — and on success rewrites the URL with `?sort=nearme&lat&lng` so
 * the server can re-order events by distance.
 */
export function NearMeSortToggle() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params?.get("sort") === "nearme";
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "error">(
    "idle",
  );

  const apply = useCallback(
    (lat: number, lng: number) => {
      const next = new URLSearchParams(params?.toString() ?? "");
      next.set("sort", "nearme");
      next.set("lat", lat.toFixed(4));
      next.set("lng", lng.toFixed(4));
      router.push(`/events?${next.toString()}`);
    },
    [params, router],
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.delete("sort");
    next.delete("lat");
    next.delete("lng");
    router.push(`/events?${next.toString()}`);
  }, [params, router]);

  const onClick = useCallback(() => {
    if (active) {
      clear();
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("idle");
        apply(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, [active, apply, clear]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        disabled={status === "locating"}
        title="Uses your device location to sort events by distance. Not stored on our servers."
        className={
          "inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
          (active
            ? "bg-primary text-on-primary"
            : "bg-surface-container-low text-on-surface hover:bg-surface-container")
        }
        data-testid="near-me-sort"
      >
        {status === "locating" ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : status === "denied" || status === "error" ? (
          <AlertCircle size={16} aria-hidden="true" />
        ) : (
          <MapPin size={16} aria-hidden="true" />
        )}
        <span>
          {status === "locating"
            ? "Locating…"
            : active
              ? "Sorted: Near me"
              : "Sort: Near me"}
        </span>
      </button>
      {status === "denied" && (
        <span className="text-xs font-body text-secondary" role="status">
          Allow location to sort by distance.{" "}
          <a
            href="/privacy#location"
            className="underline hover:text-primary"
          >
            Why we ask
          </a>
          .
        </span>
      )}
      {status === "error" && (
        <span className="text-xs font-body text-secondary" role="status">
          Couldn&apos;t get your location.
        </span>
      )}
    </div>
  );
}
