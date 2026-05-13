import { describe, it, expect } from "vitest";
import {
  SUPPORTED_CITIES,
  findCityBySlug,
  findCityByLabel,
  nearestCity,
  DEFAULT_CITY_SLUG,
} from "./cities";
import { detectCityFromHeaders } from "./detectCityFromHeaders";

describe("city registry", () => {
  it("exposes the four phase-1 cities", () => {
    const slugs = SUPPORTED_CITIES.map((c) => c.slug).sort();
    expect(slugs).toEqual(["brisbane", "gold-coast", "melbourne", "sydney"]);
  });

  it("DEFAULT_CITY_SLUG matches a known city", () => {
    expect(findCityBySlug(DEFAULT_CITY_SLUG)).not.toBeNull();
  });

  it("findCityBySlug returns null for unknown slugs", () => {
    expect(findCityBySlug("perth")).toBeNull();
    expect(findCityBySlug(null)).toBeNull();
    expect(findCityBySlug(undefined)).toBeNull();
  });

  it("findCityByLabel is case-insensitive", () => {
    expect(findCityByLabel("brisbane")?.slug).toBe("brisbane");
    expect(findCityByLabel("Gold Coast")?.slug).toBe("gold-coast");
    expect(findCityByLabel("nowhere")).toBeNull();
  });

  it("nearestCity snaps coords to the closest centre", () => {
    // Surfers Paradise is on the Gold Coast.
    expect(nearestCity(-28.0023, 153.4145).slug).toBe("gold-coast");
    // Melbourne CBD.
    expect(nearestCity(-37.8136, 144.9631).slug).toBe("melbourne");
    // Sydney CBD.
    expect(nearestCity(-33.8688, 151.2093).slug).toBe("sydney");
  });
});

describe("detectCityFromHeaders", () => {
  function h(headers: Record<string, string>): Headers {
    return new Headers(headers);
  }

  it("returns null when no Vercel headers are present (local dev)", () => {
    expect(detectCityFromHeaders(h({}))).toBeNull();
  });

  it("matches a known IP city alias", () => {
    expect(detectCityFromHeaders(h({ "x-vercel-ip-city": "Brisbane" }))?.slug).toBe("brisbane");
    expect(detectCityFromHeaders(h({ "x-vercel-ip-city": "Surfers%20Paradise" }))?.slug).toBe(
      "gold-coast",
    );
  });

  it("falls back to lat/lng snap when city header is unrecognised", () => {
    expect(
      detectCityFromHeaders(
        h({
          "x-vercel-ip-city": "Toowoomba",
          "x-vercel-ip-latitude": "-27.5598",
          "x-vercel-ip-longitude": "151.9507",
        }),
      )?.slug,
    ).toBe("brisbane");
  });

  it("returns null when only invalid coords are provided", () => {
    expect(
      detectCityFromHeaders(
        h({
          "x-vercel-ip-latitude": "not-a-number",
          "x-vercel-ip-longitude": "151",
        }),
      ),
    ).toBeNull();
  });
});
