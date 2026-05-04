"use client";

import { useCallback, useEffect, useState } from "react";

export type SupportedCity = {
  slug: string;
  label: string;
  /** Approximate centre — used only as a hint for v1 (no real geo radius yet). */
  lat: number;
  lng: number;
};

/**
 * Phase 1 supported cities per EVE-126 §4.3 city-picker fallback.
 * Sydney/Melbourne are intentionally surfaced as "coming soon" elsewhere.
 */
export const SUPPORTED_CITIES: SupportedCity[] = [
  { slug: "gold-coast", label: "Gold Coast", lat: -28.0167, lng: 153.4 },
  { slug: "brisbane", label: "Brisbane", lat: -27.4698, lng: 153.0251 },
];

export type UserLocation = {
  lat: number;
  lng: number;
  label: string;
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

function nearestCity(lat: number, lng: number): SupportedCity {
  let best = SUPPORTED_CITIES[0]!;
  let bestDist = Infinity;
  for (const c of SUPPORTED_CITIES) {
    const dLat = c.lat - lat;
    const dLng = c.lng - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
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
          radiusKm: 25,
          source: "geo",
          expiresAt: Date.now() + DEFAULT_TTL_MS,
        };
        writeStorage(loc);
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
      radiusKm: 25,
      source: "manual",
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    };
    writeStorage(loc);
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
