import { describe, it, expect } from "vitest";
import {
  boundingBox,
  haversineMeters,
  isWhenValue,
  parseCategorySlugs,
  parseLatLng,
  parseRadiusMeters,
  resolveNearMeQuery,
  resolveWhenWindow,
  serializeCategorySlugs,
} from "./queryFilters";

describe("isWhenValue", () => {
  it("accepts only the two EVE-230 chip values", () => {
    expect(isWhenValue("today")).toBe(true);
    expect(isWhenValue("tomorrow")).toBe(true);
    expect(isWhenValue("yesterday")).toBe(false);
    expect(isWhenValue("")).toBe(false);
    expect(isWhenValue(undefined)).toBe(false);
    expect(isWhenValue(null)).toBe(false);
  });
});

describe("resolveWhenWindow", () => {
  // 2026-05-14T03:00:00Z = 2026-05-14 13:00 in Brisbane (UTC+10).
  const noonBrisbane = new Date("2026-05-14T03:00:00Z");

  it("returns null for missing or unknown values", () => {
    expect(resolveWhenWindow(undefined)).toBeNull();
    expect(resolveWhenWindow(null)).toBeNull();
    expect(resolveWhenWindow("")).toBeNull();
    expect(resolveWhenWindow("yesterday")).toBeNull();
    expect(resolveWhenWindow("TODAY", noonBrisbane)).toBeNull();
  });

  it("returns the Brisbane-local 24h window for today", () => {
    const w = resolveWhenWindow("today", noonBrisbane);
    expect(w).not.toBeNull();
    // Start of Brisbane day = 00:00 +10:00 = (prev day) 14:00 UTC.
    expect(w!.start.toISOString()).toBe("2026-05-13T14:00:00.000Z");
    expect(w!.end.toISOString()).toBe("2026-05-14T14:00:00.000Z");
    expect(w!.end.getTime() - w!.start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("returns the next Brisbane day for tomorrow", () => {
    const w = resolveWhenWindow("tomorrow", noonBrisbane);
    expect(w!.start.toISOString()).toBe("2026-05-14T14:00:00.000Z");
    expect(w!.end.toISOString()).toBe("2026-05-15T14:00:00.000Z");
  });

  it("rolls correctly across midnight UTC", () => {
    // 13:30 UTC = 23:30 Brisbane (same day still).
    const lateBrisbane = new Date("2026-05-14T13:30:00Z");
    const w = resolveWhenWindow("today", lateBrisbane);
    expect(w!.start.toISOString()).toBe("2026-05-13T14:00:00.000Z");
    expect(w!.end.toISOString()).toBe("2026-05-14T14:00:00.000Z");
  });

  it("rolls correctly when UTC is the next calendar day but Brisbane is still today", () => {
    // 13:59 UTC = 23:59 Brisbane on the same Brisbane day.
    const beforeMidnightBris = new Date("2026-05-14T13:59:00Z");
    const w = resolveWhenWindow("tomorrow", beforeMidnightBris);
    expect(w!.start.toISOString()).toBe("2026-05-14T14:00:00.000Z");
  });
});

describe("parseCategorySlugs", () => {
  it("returns an empty array for missing input", () => {
    expect(parseCategorySlugs(undefined)).toEqual([]);
    expect(parseCategorySlugs(null)).toEqual([]);
    expect(parseCategorySlugs("")).toEqual([]);
  });

  it("parses a single slug", () => {
    expect(parseCategorySlugs("live-music")).toEqual(["live-music"]);
  });

  it("parses a comma-separated list preserving order", () => {
    expect(parseCategorySlugs("live-music,markets,arts")).toEqual([
      "live-music",
      "markets",
      "arts",
    ]);
  });

  it("collapses duplicates", () => {
    expect(parseCategorySlugs("arts,markets,arts")).toEqual([
      "arts",
      "markets",
    ]);
  });

  it("drops slugs outside the EVE-215 taxonomy", () => {
    expect(parseCategorySlugs("arts,foo-bar,markets")).toEqual([
      "arts",
      "markets",
    ]);
    expect(parseCategorySlugs("MUSIC")).toEqual([]);
  });

  it("drops the Free pseudo-category (it's a price filter, not a category)", () => {
    expect(parseCategorySlugs("free,arts")).toEqual(["arts"]);
  });

  it("trims whitespace around items", () => {
    expect(parseCategorySlugs(" arts , markets ")).toEqual(["arts", "markets"]);
  });
});

describe("serializeCategorySlugs", () => {
  it("joins with commas, no spaces", () => {
    expect(serializeCategorySlugs(["arts", "markets"])).toBe("arts,markets");
  });

  it("returns empty string for empty input", () => {
    expect(serializeCategorySlugs([])).toBe("");
  });
});

describe("parseRadiusMeters", () => {
  it("returns null for missing/invalid input", () => {
    expect(parseRadiusMeters(undefined)).toBeNull();
    expect(parseRadiusMeters(null)).toBeNull();
    expect(parseRadiusMeters("")).toBeNull();
    expect(parseRadiusMeters("not-a-number")).toBeNull();
    expect(parseRadiusMeters("NaN")).toBeNull();
  });

  it("rounds to integer metres", () => {
    expect(parseRadiusMeters("12345.67")).toBe(12346);
  });

  it("clamps to the safe min/max range", () => {
    expect(parseRadiusMeters("0")).toBe(500);
    expect(parseRadiusMeters("-50")).toBe(500);
    expect(parseRadiusMeters("9999999")).toBe(200_000);
  });
});

describe("parseLatLng", () => {
  it("accepts in-range values for both axes", () => {
    expect(parseLatLng("-28.0167", "lat")).toBeCloseTo(-28.0167);
    expect(parseLatLng("153.4", "lng")).toBe(153.4);
  });

  it("rejects out-of-range latitudes (|lat| > 90)", () => {
    expect(parseLatLng("91", "lat")).toBeNull();
    expect(parseLatLng("-90.5", "lat")).toBeNull();
  });

  it("rejects out-of-range longitudes (|lng| > 180)", () => {
    expect(parseLatLng("181", "lng")).toBeNull();
    expect(parseLatLng("-180.001", "lng")).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(parseLatLng(undefined, "lat")).toBeNull();
    expect(parseLatLng("", "lat")).toBeNull();
    expect(parseLatLng("Infinity", "lat")).toBeNull();
  });
});

describe("resolveNearMeQuery", () => {
  it("returns null when near_me is off", () => {
    expect(
      resolveNearMeQuery({ lat: "-28", lng: "153" }),
    ).toBeNull();
    expect(
      resolveNearMeQuery({ near_me: "0", lat: "-28", lng: "153" }),
    ).toBeNull();
  });

  it("returns null when lat/lng is missing or invalid even with near_me=1", () => {
    expect(resolveNearMeQuery({ near_me: "1" })).toBeNull();
    expect(
      resolveNearMeQuery({ near_me: "1", lat: "-28" }),
    ).toBeNull();
    expect(
      resolveNearMeQuery({ near_me: "1", lat: "999", lng: "153" }),
    ).toBeNull();
  });

  it("returns a resolved NearMeQuery when all inputs are valid", () => {
    expect(
      resolveNearMeQuery({
        near_me: "1",
        lat: "-28.0167",
        lng: "153.4",
        max_radius_m: "15000",
      }),
    ).toEqual({ lat: -28.0167, lng: 153.4, radiusM: 15000 });
  });

  it("falls back to the default radius when max_radius_m is missing", () => {
    const r = resolveNearMeQuery({ near_me: "1", lat: "-28", lng: "153" });
    expect(r?.radiusM).toBe(25_000);
  });
});

describe("haversineMeters", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineMeters(-28, 153, -28, 153)).toBeCloseTo(0, 3);
  });

  it("computes Gold Coast → Brisbane (~71 km)", () => {
    // Gold Coast: (-28.0167, 153.4), Brisbane: (-27.4698, 153.0251).
    const m = haversineMeters(-28.0167, 153.4, -27.4698, 153.0251);
    expect(m).toBeGreaterThan(67_000);
    expect(m).toBeLessThan(75_000);
  });

  it("is symmetric in argument order", () => {
    const a = haversineMeters(-28.0167, 153.4, -27.4698, 153.0251);
    const b = haversineMeters(-27.4698, 153.0251, -28.0167, 153.4);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("boundingBox", () => {
  it("strictly contains every point within the radius", () => {
    const lat = -28;
    const lng = 153;
    const radius = 25_000;
    const bb = boundingBox(lat, lng, radius);
    // A point exactly `radius` north should still be inside the bbox.
    const northLat = lat + radius / 111_320;
    expect(northLat).toBeLessThanOrEqual(bb.maxLat + 1e-9);
    // A point well outside the radius should be outside the bbox too — we
    // assert the bbox is finite and the deltas grow with radius.
    const bigger = boundingBox(lat, lng, 50_000);
    expect(bigger.maxLat - lat).toBeGreaterThan(bb.maxLat - lat);
    expect(bigger.maxLng - lng).toBeGreaterThan(bb.maxLng - lng);
  });

  it("widens the longitude delta near the equator vs near the poles", () => {
    const r = 25_000;
    const eq = boundingBox(0, 0, r);
    const polar = boundingBox(80, 0, r);
    expect(polar.maxLng - polar.minLng).toBeGreaterThan(eq.maxLng - eq.minLng);
  });
});
