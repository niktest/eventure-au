import { describe, it, expect } from "vitest";
import { getZeroResultSuggestions } from "./zeroResultSuggestions";

const GC = { citySlug: "gold-coast", cityLabel: "Gold Coast" };

describe("getZeroResultSuggestions", () => {
  it("always returns at least one suggestion, even with no filters and no context", () => {
    const result = getZeroResultSuggestions({});
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.href).toBeTruthy();
  });

  it("offers 'this weekend' as a jump-off when no when= is set", () => {
    const result = getZeroResultSuggestions({}, GC);
    const weekend = result.find((s) => s.key === "weekend");
    expect(weekend).toBeDefined();
    expect(weekend!.href).toBe("/events?near=gold-coast&when=weekend");
    expect(weekend!.label).toBe("Try this weekend in Gold Coast");
  });

  it("omits the weekend suggestion when the user already filters by weekend", () => {
    const result = getZeroResultSuggestions({ when: "weekend" }, GC);
    expect(result.find((s) => s.key === "weekend")).toBeUndefined();
  });

  it("offers the top category in the city when one is known", () => {
    const result = getZeroResultSuggestions(
      {},
      { ...GC, topCategory: { slug: "music", label: "Music" } },
    );
    const top = result.find((s) => s.key === "top-category");
    expect(top).toBeDefined();
    expect(top!.href).toBe("/events?near=gold-coast&category=music");
    expect(top!.label).toBe("Browse Music in Gold Coast");
  });

  it("omits the top-category suggestion when the active category already matches", () => {
    const result = getZeroResultSuggestions(
      { category: "music" },
      { ...GC, topCategory: { slug: "music", label: "Music" } },
    );
    expect(result.find((s) => s.key === "top-category")).toBeUndefined();
  });

  it("broadens by dropping the free-text query first (most restrictive)", () => {
    const result = getZeroResultSuggestions(
      { q: "abba", category: "music", when: "weekend" },
      GC,
    );
    const broaden = result.find((s) => s.key.startsWith("broaden-"));
    expect(broaden).toBeDefined();
    expect(broaden!.key).toBe("broaden-q");
    expect(broaden!.href).toBe(
      "/events?category=music&when=weekend&near=gold-coast",
    );
  });

  it("drops a time window before dropping the category", () => {
    const result = getZeroResultSuggestions(
      { category: "music", when: "today" },
      GC,
    );
    const broaden = result.find((s) => s.key.startsWith("broaden-"));
    expect(broaden!.key).toBe("broaden-when");
    expect(broaden!.href).toBe("/events?category=music&near=gold-coast");
  });

  it("drops redundant date params when dropping `when`", () => {
    const result = getZeroResultSuggestions(
      { when: "today", date: "2026-05-13" },
      GC,
    );
    const broaden = result.find((s) => s.key.startsWith("broaden-"));
    expect(broaden!.href).toBe("/events?near=gold-coast");
  });

  it("provides a clear-filters fallback when multiple filters are active", () => {
    const result = getZeroResultSuggestions(
      { category: "music", when: "today" },
      GC,
    );
    const clear = result.find((s) => s.key === "clear");
    expect(clear).toBeDefined();
    expect(clear!.href).toBe("/events?near=gold-coast");
  });

  it("produces a stable, deterministic ordering for a given input", () => {
    const a = getZeroResultSuggestions(
      { category: "music", when: "today" },
      { ...GC, topCategory: { slug: "family", label: "Family" } },
    );
    const b = getZeroResultSuggestions(
      { category: "music", when: "today" },
      { ...GC, topCategory: { slug: "family", label: "Family" } },
    );
    expect(a).toEqual(b);
    expect(a.map((s) => s.key)).toEqual([
      "weekend",
      "top-category",
      "broaden-when",
      "clear",
    ]);
  });

  it("dedupes when broaden and clear-filters resolve to the same URL", () => {
    const result = getZeroResultSuggestions({ category: "music" }, GC);
    const hrefs = result.map((s) => s.href);
    const unique = new Set(hrefs);
    expect(hrefs.length).toBe(unique.size);
  });

  it("falls back to a 'browse all' link when there is genuinely nothing else to offer", () => {
    const result = getZeroResultSuggestions(
      { when: "weekend" },
      { ...GC, topCategory: null },
    );
    // weekend filter active + no top category — the clear-filters action
    // still applies, but the function should never return an empty array.
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.href.startsWith("/"))).toBe(true);
  });
});
