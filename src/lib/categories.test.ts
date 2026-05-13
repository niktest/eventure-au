import { describe, it, expect } from "vitest";
import { categoryHref, resolveCategoryFilter } from "./categories";

describe("categoryHref", () => {
  it("builds a plain category URL", () => {
    expect(categoryHref("music")).toBe("/events?category=music");
  });

  it("preserves the city on city-page chips (EVE-207)", () => {
    expect(categoryHref("music", { city: "Gold Coast" })).toBe(
      "/events?category=music&city=Gold+Coast",
    );
  });

  it("ignores an empty/null city", () => {
    expect(categoryHref("sport", { city: null })).toBe("/events?category=sport");
    expect(categoryHref("sport", { city: "" })).toBe("/events?category=sport");
  });
});

describe("resolveCategoryFilter", () => {
  it("returns null for unknown slugs", () => {
    expect(resolveCategoryFilter("nope")).toBeNull();
  });

  it("returns an enum filter for music", () => {
    expect(resolveCategoryFilter("music")).toEqual({ enums: ["MUSIC"] });
  });

  it("returns enum + tags for cultural-community", () => {
    expect(resolveCategoryFilter("cultural-community")).toEqual({
      enums: ["COMMUNITY"],
      tags: ["culture", "cultural"],
    });
  });
});
