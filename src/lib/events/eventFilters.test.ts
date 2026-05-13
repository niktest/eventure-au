import { describe, it, expect } from "vitest";
import { buildEventFilters, hasActiveFilters } from "./eventFilters";

const NOW = new Date("2026-05-13T00:00:00.000Z");

function flatten(where: ReturnType<typeof buildEventFilters>): unknown[] {
  // `buildEventFilters` always wraps conditions in a top-level AND.
  const top = where as { AND?: unknown[] };
  return top.AND ?? [];
}

describe("buildEventFilters", () => {
  it("requires published status and a future-or-from date", () => {
    const where = buildEventFilters({}, NOW);
    const conds = flatten(where);
    expect(conds).toContainEqual({ status: "published" });
    expect(conds).toContainEqual({ startDate: { gte: NOW } });
  });

  it("supports a single-day window via ?date=YYYY-MM-DD", () => {
    const where = buildEventFilters({ date: "2026-06-01" }, NOW);
    const conds = flatten(where);
    const dateCond = conds.find(
      (c): c is { startDate: { gte: Date; lt: Date } } =>
        typeof c === "object" &&
        c !== null &&
        "startDate" in c &&
        "lt" in (c as { startDate: object }).startDate,
    );
    expect(dateCond).toBeDefined();
    expect(dateCond!.startDate.gte.toISOString()).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(dateCond!.startDate.lt.toISOString()).toBe(
      "2026-06-02T00:00:00.000Z",
    );
  });

  it("ORs multiple categories together", () => {
    const where = buildEventFilters({ category: "music,family" }, NOW);
    const conds = flatten(where);
    // Music + Family both have `enums` only, so each slug yields a single
    // condition and they OR together at the top level.
    const orCond = conds.find(
      (c): c is { OR: unknown[] } =>
        typeof c === "object" && c !== null && "OR" in c,
    );
    expect(orCond).toBeDefined();
    expect(orCond!.OR.length).toBe(2);
  });

  it("treats a single category slug as a plain condition (homepage links)", () => {
    const where = buildEventFilters({ category: "music" }, NOW);
    const conds = flatten(where);
    expect(conds).toContainEqual({
      category: { in: ["MUSIC"] },
    });
  });

  it("price=free filters to isFree", () => {
    const conds = flatten(buildEventFilters({ price: "free" }, NOW));
    expect(conds).toContainEqual({ isFree: true });
  });

  it("price=paid filters to non-free or priced", () => {
    const conds = flatten(buildEventFilters({ price: "paid" }, NOW));
    expect(conds).toContainEqual({
      OR: [{ isFree: false }, { priceMin: { gt: 0 } }],
    });
  });

  it("honours legacy free=1 as price=free", () => {
    const conds = flatten(buildEventFilters({ free: "1" }, NOW));
    expect(conds).toContainEqual({ isFree: true });
  });

  it("setting=outdoor matches OUTDOOR category or outdoor tags", () => {
    const conds = flatten(buildEventFilters({ setting: "outdoor" }, NOW));
    const out = conds.find(
      (c): c is { OR: Array<{ category?: string; tags?: object }> } =>
        typeof c === "object" &&
        c !== null &&
        "OR" in c &&
        (c as { OR: unknown[] }).OR.length === 2 &&
        JSON.stringify(c).includes("OUTDOOR"),
    );
    expect(out).toBeDefined();
  });

  it("setting=indoor matches indoor-tagged events", () => {
    const conds = flatten(buildEventFilters({ setting: "indoor" }, NOW));
    expect(conds).toContainEqual({
      tags: { hasSome: ["indoor", "indoors", "venue"] },
    });
  });

  it("age=family matches FAMILY category or family tags", () => {
    const conds = flatten(buildEventFilters({ age: "family" }, NOW));
    expect(
      conds.some(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          "OR" in c &&
          JSON.stringify(c).includes("FAMILY"),
      ),
    ).toBe(true);
  });

  it("age=adults matches NIGHTLIFE or 18+ tags", () => {
    const conds = flatten(buildEventFilters({ age: "adults" }, NOW));
    expect(
      conds.some(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          "OR" in c &&
          JSON.stringify(c).includes("NIGHTLIFE"),
      ),
    ).toBe(true);
  });

  it("location performs a contains match across city/venue fields", () => {
    const conds = flatten(
      buildEventFilters({ location: "Surfers" }, NOW),
    );
    const loc = conds.find(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        "OR" in c &&
        JSON.stringify(c).includes("Surfers"),
    );
    expect(loc).toBeDefined();
    expect(JSON.stringify(loc)).toContain("venueAddress");
  });

  it("q searches name/description/venue/tag", () => {
    const conds = flatten(buildEventFilters({ q: "Jazz" }, NOW));
    const q = conds.find(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        "OR" in c &&
        JSON.stringify(c).includes("Jazz"),
    );
    expect(q).toBeDefined();
    // Tag match should lowercase the term.
    expect(JSON.stringify(q)).toContain('"has":"jazz"');
  });
});

describe("hasActiveFilters", () => {
  it("returns false for the default view", () => {
    expect(hasActiveFilters({})).toBe(false);
  });

  it("detects each filter dimension", () => {
    expect(hasActiveFilters({ q: "x" })).toBe(true);
    expect(hasActiveFilters({ category: "music" })).toBe(true);
    expect(hasActiveFilters({ price: "free" })).toBe(true);
    expect(hasActiveFilters({ free: "1" })).toBe(true);
    expect(hasActiveFilters({ setting: "outdoor" })).toBe(true);
    expect(hasActiveFilters({ age: "family" })).toBe(true);
    expect(hasActiveFilters({ location: "Brisbane" })).toBe(true);
    expect(hasActiveFilters({ dateFrom: "2026-01-01" })).toBe(true);
  });

  it("ignores empty strings", () => {
    expect(hasActiveFilters({ q: "   ", location: "" })).toBe(false);
  });
});
