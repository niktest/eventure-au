import { describe, it, expect } from "vitest";
import { parseNearMeCoords, sortEventsByDistance } from "./eventFilters";

describe("parseNearMeCoords", () => {
  it("returns null when sort is not 'nearme'", () => {
    expect(parseNearMeCoords({ lat: "-28", lng: "153" })).toBeNull();
  });

  it("returns null with missing or invalid coords", () => {
    expect(parseNearMeCoords({ sort: "nearme" })).toBeNull();
    expect(parseNearMeCoords({ sort: "nearme", lat: "abc", lng: "153" })).toBeNull();
    expect(parseNearMeCoords({ sort: "nearme", lat: "999", lng: "153" })).toBeNull();
    expect(parseNearMeCoords({ sort: "nearme", lat: "-28", lng: "999" })).toBeNull();
  });

  it("parses valid coords", () => {
    expect(parseNearMeCoords({ sort: "nearme", lat: "-28.01", lng: "153.4" })).toEqual({
      lat: -28.01,
      lng: 153.4,
    });
  });
});

describe("sortEventsByDistance", () => {
  type E = { id: string; latitude: number | null; longitude: number | null; startDate: Date };
  const now = new Date("2026-05-13T00:00:00Z");
  const goldCoast: E = { id: "gc", latitude: -28.0167, longitude: 153.4, startDate: now };
  const brisbane: E = { id: "bne", latitude: -27.4698, longitude: 153.0251, startDate: now };
  const sydney: E = { id: "syd", latitude: -33.8688, longitude: 151.2093, startDate: now };
  const noCoords: E = { id: "x", latitude: null, longitude: null, startDate: now };

  it("orders events by squared distance ascending", () => {
    const out = sortEventsByDistance([sydney, brisbane, goldCoast], {
      lat: -28.0023,
      lng: 153.4145,
    });
    expect(out.map((e) => e.id)).toEqual(["gc", "bne", "syd"]);
  });

  it("pushes events without coordinates to the end", () => {
    const out = sortEventsByDistance([noCoords, goldCoast, brisbane], {
      lat: -28.0023,
      lng: 153.4145,
    });
    expect(out.map((e) => e.id)).toEqual(["gc", "bne", "x"]);
  });
});
