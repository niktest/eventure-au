import { describe, it, expect } from "vitest";
import {
  HOMEPAGE_CATEGORIES,
  allCategoriesHref,
  categoryHref,
  categoryToggleHref,
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

  describe("with preserve (EVE-229 — Browse↔Home state sync)", () => {
    it("carries non-chip-axis params through so date survives a chip click", () => {
      const href = categoryHref("live-music", { date: "2026-05-16" });
      expect(href).toBe("/events?date=2026-05-16&category=live-music");
    });

    it("preserves multiple orthogonal params (q, dateFrom, dateTo, near)", () => {
      const href = categoryHref("markets", {
        q: "vintage",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        near: "gold-coast",
      });
      expect(href).toContain("q=vintage");
      expect(href).toContain("dateFrom=2026-05-01");
      expect(href).toContain("dateTo=2026-05-31");
      expect(href).toContain("near=gold-coast");
      expect(href).toContain("category=markets");
    });

    it("replaces chip-axis params (category, price, free) since chips are mutually exclusive", () => {
      const href = categoryHref("comedy", {
        category: "live-music",
        price: "free",
        free: "1",
        date: "2026-05-16",
      });
      expect(href).toBe("/events?date=2026-05-16&category=comedy");
    });

    it("routes the Free chip to ?price=free even with preserved params", () => {
      const href = categoryHref("free", {
        date: "2026-05-16",
        category: "live-music",
      });
      expect(href).toBe("/events?date=2026-05-16&price=free");
    });

    it("accepts a URLSearchParams instance for preserve", () => {
      const sp = new URLSearchParams("date=2026-05-16&category=stale");
      expect(categoryHref("arts", sp)).toBe(
        "/events?date=2026-05-16&category=arts",
      );
    });

    it("ignores undefined values in the preserve object", () => {
      expect(categoryHref("arts", { date: undefined, q: "jazz" })).toBe(
        "/events?q=jazz&category=arts",
      );
    });
  });
});

describe("allCategoriesHref", () => {
  it("returns the bare /events route with no preserve", () => {
    expect(allCategoriesHref()).toBe("/events");
  });

  it("keeps non-chip-axis params and drops category/price/free", () => {
    expect(
      allCategoriesHref({
        date: "2026-05-16",
        q: "markets",
        category: "live-music",
        price: "free",
        free: "1",
      }),
    ).toBe("/events?date=2026-05-16&q=markets");
  });
});

describe("categoryToggleHref (EVE-230 — multi-select chips on /events)", () => {
  it("adds a slug to an empty active list", () => {
    expect(categoryToggleHref("arts", [])).toBe("/events?category=arts");
  });

  it("appends a slug to an existing active list, preserving order", () => {
    expect(categoryToggleHref("markets", ["arts"])).toBe(
      "/events?category=arts%2Cmarkets",
    );
  });

  it("removes a slug that is already active", () => {
    expect(categoryToggleHref("arts", ["arts", "markets"])).toBe(
      "/events?category=markets",
    );
  });

  it("drops the category param entirely when the last slug is removed", () => {
    expect(categoryToggleHref("arts", ["arts"])).toBe("/events");
  });

  it("carries non-chip-axis preserve params through the toggle", () => {
    expect(
      categoryToggleHref("arts", ["markets"], { date: "2026-05-16" }),
    ).toBe("/events?date=2026-05-16&category=markets%2Carts");
  });

  it("ignores any preserved chip-axis params so the toggle is the source of truth", () => {
    // The category in `preserve` would otherwise clobber the toggle target.
    expect(
      categoryToggleHref("arts", ["arts", "markets"], {
        category: "stale,values",
        price: "free",
      }),
    ).toBe("/events?category=markets");
  });

  it("toggles the Free chip via ?price=free independently of categories", () => {
    expect(
      categoryToggleHref("free", ["arts"], undefined, { freeActive: false }),
    ).toBe("/events?price=free&category=arts");
    expect(
      categoryToggleHref("free", ["arts"], undefined, { freeActive: true }),
    ).toBe("/events?category=arts");
  });

  it("keeps the Free predicate active when toggling a category chip", () => {
    expect(
      categoryToggleHref("arts", ["markets"], undefined, { freeActive: true }),
    ).toBe("/events?category=markets%2Carts&price=free");
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
