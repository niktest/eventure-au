import { SUPPORTED_CITIES, nearestCity, type SupportedCity } from "./cities";

/**
 * Detect a supported city from Vercel's edge geolocation headers.
 *
 * `request.geo` was removed in Next 15, so we read the underlying
 * `x-vercel-ip-*` headers directly. Behaviour:
 *   1. If `x-vercel-ip-city` matches any city alias, return that city.
 *   2. Otherwise, if `x-vercel-ip-latitude/longitude` are present, snap to
 *      the nearest supported city centre.
 *   3. Otherwise return `null` — the caller decides whether to fall back to
 *      the default (e.g. Gold Coast on home page) or to leave the cookie
 *      unset and prompt the user.
 *
 * Returns `null` locally where no Vercel headers are set; the cookie stays
 * empty and the home page falls back to its default city.
 */
export function detectCityFromHeaders(headers: Headers): SupportedCity | null {
  const cityHeader = headers.get("x-vercel-ip-city");
  if (cityHeader) {
    const decoded = safeDecode(cityHeader).toLowerCase();
    const aliasMatch = SUPPORTED_CITIES.find((c) =>
      c.ipAliases.some((alias) => decoded.includes(alias)),
    );
    if (aliasMatch) return aliasMatch;
  }

  const latRaw = headers.get("x-vercel-ip-latitude");
  const lngRaw = headers.get("x-vercel-ip-longitude");
  if (latRaw && lngRaw) {
    const lat = Number.parseFloat(latRaw);
    const lng = Number.parseFloat(lngRaw);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return nearestCity(lat, lng);
    }
  }

  return null;
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
