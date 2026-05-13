"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CITY_COOKIE,
  CITY_COOKIE_MAX_AGE_SECONDS,
  CITY_SOURCE_COOKIE,
} from "./cityCookie";
import { nearestCity, type SupportedCity } from "./cities";

export type { SupportedCity } from "./cities";
export { SUPPORTED_CITIES } from "./cities";

export type UserLocation = {
  lat: number;
  lng: number;
  label: string;
  slug: string;
  /** Hint only — radius filter is not implemented in v1 (city-slug match). */
  radiusKm: number;
  source: "geo" | "manual";
  expiresAt: number;
};

const STORAGE_KEY = "eventure:userLocation";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type GeoStatus =
  | "idle"
  | "locating"
  | "located"
  | "denied"
  | "unsupported"
  | "error";

function readStorage(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserLocation;
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(loc: UserLocation | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!loc) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // localStorage unavailable (private mode, quota) — no-op.
  }
}

/** Persist the user's city choice in the cookie middleware reads next visit. */
export function writeCityCookie(slug: string, source: "manual" | "ip"): void {
  if (typeof document === "undefined") return;
  const maxAge = CITY_COOKIE_MAX_AGE_SECONDS;
  document.cookie = `${CITY_COOKIE}=${encodeURIComponent(slug)}; max-age=${maxAge}; path=/; samesite=lax`;
  document.cookie = `${CITY_SOURCE_COOKIE}=${source}; max-age=${maxAge}; path=/; samesite=lax`;
}

export function useUserLocation() {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [location, setLocation] = useState<UserLocation | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = readStorage();
    if (stored) {
      setLocation(stored);
      setStatus("located");
    }
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    const startedAt = Date.now();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = nearestCity(latitude, longitude);
        const loc: UserLocation = {
          lat: latitude,
          lng: longitude,
          label: city.label,
          slug: city.slug,
          radiusKm: 25,
          source: "geo",
          expiresAt: Date.now() + DEFAULT_TTL_MS,
        };
        writeStorage(loc);
        // Geolocation is an explicit user action, so persist the resolved
        // city as a "manual" choice in the cookie — middleware won't
        // overwrite it on subsequent visits.
        writeCityCookie(city.slug, "manual");
        // Min 350ms display to avoid flash per spec.
        const elapsed = Date.now() - startedAt;
        const delay = Math.max(0, 350 - elapsed);
        window.setTimeout(() => {
          setLocation(loc);
          setStatus("located");
        }, delay);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  const setManualCity = useCallback((city: SupportedCity) => {
    const loc: UserLocation = {
      lat: city.lat,
      lng: city.lng,
      label: city.label,
      slug: city.slug,
      radiusKm: 25,
      source: "manual",
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    };
    writeStorage(loc);
    writeCityCookie(city.slug, "manual");
    setLocation(loc);
    setStatus("located");
  }, []);

  const clear = useCallback(() => {
    writeStorage(null);
    setLocation(null);
    setStatus("idle");
  }, []);

  return { status, location, requestGeolocation, setManualCity, clear };
}
