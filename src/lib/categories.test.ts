import { describe, it, expect } from "vitest";
import {
  HOMEPAGE_CATEGORIES,
  categoryHref,
  resolveCategoryFilter,
} from "./categories";

describe("HOMEPAGE_CATEGORIES", () => {
  it("ships the 12-chip EVE-215 taxonomy in order", () => {
    expect(HOMEPAGE_CATEGORIES.map((c) => c.slug)).toEqual([
      "live-music",
      "comedy",
      "markets",
      "food-drink",
      "family",
      "free",
      "outdoors",
      "arts",
      "sport",
      "nightlife",
      "workshops",
      "community",
    ]);
  });

  it("uses the EVE-215 labels", () => {
    const bySlug = Object.fromEntries(
      HOMEPAGE_CATEGORIES.map((c) => [c.slug, c.label]),
    );
    expect(bySlug["live-music"]).toBe("Live Music");
    expect(bySlug["food-drink"]).toBe("Food & Drink");
    expect(bySlug["community"]).toBe("Community");
  });

  it("does not expose magentaAccent (Pop Up chip is gone)", () => {
    for (const cat of HOMEPAGE_CATEGORIES) {
      expect((cat as Record<string, unknown>).magentaAccent).toBeUndefined();
    }
  });
});

describe("categoryHref", () => {
  it("routes the Free chip to the canonical EVE-219 price filter, never ?category=free", () => {
    const href = categoryHref("free");
    expect(href).toBe("/events?price=free");
    expect(href).not.toContain("category=");
    expect(href).not.toContain("free=1");
  });

  it("preserves the city slug shape for normal category chips", () => {
    expect(categoryHref("live-music")).toBe("/events?category=live-music");
    expect(categoryHref("community")).toBe("/events?category=community");
  });
});

describe("resolveCategoryFilter", () => {
  it("maps live-music to the MUSIC enum (no tag fallback)", () => {
    expect(resolveCategoryFilter("live-music")).toEqual({ enums: ["MUSIC"] });
  });

  it("maps community to the COMMUNITY enum (drops the legacy tag fallback)", () => {
    expect(resolveCategoryFilter("community")).toEqual({ enums: ["COMMUNITY"] });
  });

  it("keeps workshops as the only tag-only chip", () => {
    expect(resolveCategoryFilter("workshops")).toEqual({ tags: ["workshop"] });
  });

  it("covers every non-free slug in the taxonomy", () => {
    for (const cat of HOMEPAGE_CATEGORIES) {
      if (cat.slug === "free") continue;
      expect(resolveCategoryFilter(cat.slug)).not.toBeNull();
    }
  });

  it("returns null for free (it's a price filter, not a category)", () => {
    expect(resolveCategoryFilter("free")).toBeNull();
  });

  it("returns null for retired chips (music, concerts, hobby, pop-up, ...)", () => {
    expect(resolveCategoryFilter("music")).toBeNull();
    expect(resolveCategoryFilter("concerts")).toBeNull();
    expect(resolveCategoryFilter("hobby")).toBeNull();
    expect(resolveCategoryFilter("business")).toBeNull();
    expect(resolveCategoryFilter("exhibitions")).toBeNull();
    expect(resolveCategoryFilter("festivals")).toBeNull();
    expect(resolveCategoryFilter("pop-up")).toBeNull();
    expect(resolveCategoryFilter("cultural-community")).toBeNull();
  });
});
