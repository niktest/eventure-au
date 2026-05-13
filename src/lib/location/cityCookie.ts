/**
 * City-cookie constants shared by server (middleware, pages) and client
 * (header picker, useUserLocation hook). EVE-209.
 *
 * The cookie is set by middleware on first visit from IP geolocation and is
 * read by:
 *   - Home page (`/`) to scope upcoming events to the selected city.
 *   - `/events` to pre-fill the city filter when no `?near`/`?city` is set.
 *   - The header city picker to render the current selection.
 *
 * The same value is mirrored to a client-side flag so client components can
 * tell whether the city came from IP detection (show "Change city" hint)
 * versus an explicit user choice.
 */

export const CITY_COOKIE = "festlio_city";
export const CITY_SOURCE_COOKIE = "festlio_city_source";

/** 180 days — sticky enough to feel "set once" but auto-refreshes if revisited. */
export const CITY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type CitySource = "ip" | "manual";
