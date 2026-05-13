import { cookies } from "next/headers";
import {
  findCityBySlug,
  DEFAULT_CITY_SLUG,
  type SupportedCity,
} from "./cities";
import { CITY_COOKIE, CITY_SOURCE_COOKIE, type CitySource } from "./cityCookie";

export type SelectedCityResult = {
  city: SupportedCity;
  source: CitySource | "default";
};

/**
 * Resolve the user's currently selected city from the cookie set by
 * middleware. Falls back to `DEFAULT_CITY_SLUG` so server components can
 * always render a city-scoped view rather than the national firehose.
 *
 * EVE-209 — Tier 1: every page render is "city-aware" by default.
 */
export async function getSelectedCity(): Promise<SelectedCityResult> {
  const jar = await cookies();
  const slug = jar.get(CITY_COOKIE)?.value ?? null;
  const sourceRaw = jar.get(CITY_SOURCE_COOKIE)?.value ?? null;
  const city = findCityBySlug(slug);
  if (city) {
    const source: CitySource =
      sourceRaw === "manual" ? "manual" : "ip";
    return { city, source };
  }
  return { city: findCityBySlug(DEFAULT_CITY_SLUG)!, source: "default" };
}
