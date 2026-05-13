/**
 * Tests for the dedup module's pure matching helpers.
 * Database-dependent paths (upsertEvents, findAndLinkDuplicates) are
 * tested via Playwright E2E against a real database.
 */
import { describe, it, expect } from "vitest";
import { normaliseForMatch, nameSimilarity, isDuplicate } from "./index";

describe("normaliseForMatch", () => {
  it("lowercases text", () => {
    expect(normaliseForMatch("HELLO WORLD")).toBe("hello world");
  });

  it("removes articles", () => {
    expect(normaliseForMatch("The Big Concert")).toBe("big concert");
  });

  it("strips trailing 'live at VENUE' suffix to match bare-name listings", () => {
    // Two listings of the same gig should normalise identically.
    expect(normaliseForMatch("Hannah Gadsby Live at HOTA")).toBe("hannah gadsby");
    expect(normaliseForMatch("Hannah Gadsby")).toBe("hannah gadsby");
  });

  it("removes punctuation", () => {
    expect(normaliseForMatch("Rock & Roll! (Live)")).toBe("rock roll live");
  });

  it("collapses multiple spaces", () => {
    expect(normaliseForMatch("  extra   spaces  here  ")).toBe("extra spaces here");
  });

  it("handles empty string", () => {
    expect(normaliseForMatch("")).toBe("");
  });

  it("strips leading emoji", () => {
    expect(normaliseForMatch("❄️ Alphabet Soup")).toBe("alphabet soup");
  });

  it("strips trailing emoji clusters", () => {
    expect(normaliseForMatch("Winter Wonderland 🌈✨")).toBe("winter wonderland");
  });

  it("strips leading category prefix", () => {
    expect(normaliseForMatch("COMEDY: Hannah Gadsby Live")).toBe("hannah gadsby live");
    expect(normaliseForMatch("Music - Splendour")).toBe("splendour");
  });

  it("strips trailing country tag", () => {
    expect(normaliseForMatch("Hannah Gadsby Live (Australia)")).toBe("hannah gadsby live");
    expect(normaliseForMatch("Strung Out (USA)")).toBe("strung out");
  });

  it("strips trailing location tag", () => {
    expect(normaliseForMatch("Drag Paint and Sip - Gold Coast")).toBe("drag paint sip");
  });

  it("strips smart quotes", () => {
    expect(normaliseForMatch("‘Wonderland’ Tour")).toBe("wonderland tour");
  });
});

describe("nameSimilarity (Dice coefficient)", () => {
  it("returns 1 for identical strings", () => {
    expect(nameSimilarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    const sim = nameSimilarity("abc", "xyz");
    expect(sim).toBe(0);
  });

  it("returns high similarity for minor differences", () => {
    const sim = nameSimilarity("summer music festival", "summer music fest");
    expect(sim).toBeGreaterThan(0.7);
  });

  it("returns low similarity for very different strings", () => {
    const sim = nameSimilarity("gold coast marathon", "jazz night at hota");
    expect(sim).toBeLessThan(0.3);
  });

  it("normalisation lifts emoji-prefixed names above the venue threshold", () => {
    const a = normaliseForMatch("❄️ Alphabet Soup – Winter Wonderland Edition 🌈✨");
    const b = normaliseForMatch("Alphabet Soup – Winter Wonderland Edition");
    expect(nameSimilarity(a, b)).toBeGreaterThan(0.85);
  });

  it("normalisation makes country-tagged names match the bare name", () => {
    const a = normaliseForMatch("Strung Out (USA)");
    const b = normaliseForMatch("Strung Out");
    expect(nameSimilarity(a, b)).toBe(1);
  });
});

describe("isDuplicate — cross-source pair predicate", () => {
  // Real fixtures from the live DB — pairs that the OLD rule (sim≥0.85 AND
  // city=city) was missing. See scripts/dedup-probe.ts.
  const base = {
    venueName: "Miami Marketta",
    state: "QLD",
    latitude: -28.07,
    longitude: 153.45,
    startDate: new Date("2026-06-12T19:00:00Z"),
  };

  it("matches suburb-vs-metro listings of the same venue (Miami vs Gold Coast)", () => {
    const a = {
      ...base,
      name: "Drag Queen Bingo | 13 May",
      source: "oztix",
      city: "Miami",
    };
    const b = {
      ...base,
      name: "DRAG QUEEN BINGO | 13 May",
      source: "miamimarketta",
      city: "Gold Coast",
    };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("matches Ticketmaster↔Moshtix listings with 10h timezone offset", () => {
    // Real case from prod: same gig, both adapters but stored 10h apart.
    const a = {
      name: "Will Sparks - Classics Tour",
      source: "ticketmaster",
      venueName: "The Timber Yard",
      city: "Port Melbourne",
      state: "VIC",
      latitude: -37.84,
      longitude: 144.92,
      startDate: new Date("2026-06-12T09:00:00Z"),
    };
    const b = {
      ...a,
      source: "moshtix",
      startDate: new Date("2026-06-12T19:00:00Z"),
    };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("matches when one source has emoji/decorations and the other doesn't", () => {
    const a = {
      name: "❄️ Alphabet Soup – Winter Wonderland Edition 🌈✨",
      source: "meetup",
      venueName: "Some Bar",
      city: "Brunswick",
      state: "VIC",
      latitude: -37.77,
      longitude: 144.96,
      startDate: new Date("2026-06-12T19:00:00Z"),
    };
    const b = {
      ...a,
      name: "Alphabet Soup - Winter Wonderland Edition",
      source: "eventbrite",
      city: "Melbourne",
    };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("matches when venue names differ but coords are within 10km", () => {
    const a = {
      name: "Buzz Kull",
      source: "ticketmaster",
      venueName: "The Vanguard",
      city: "Newtown",
      state: "NSW",
      latitude: -33.897,
      longitude: 151.179,
      startDate: new Date("2026-06-26T09:00:00Z"),
    };
    const b = {
      ...a,
      source: "moshtix",
      venueName: "Vanguard Newtown",
      startDate: new Date("2026-06-26T19:00:00Z"),
    };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("matches multi-day-festival listings on adjacent days via state+12h window", () => {
    // Same festival opening, listed by one source at 8pm Friday and another at
    // 6pm Friday (same calendar day, different start times).
    const a = {
      name: "Splendour in the Grass 2026",
      source: "moshtix",
      venueName: "North Byron Parklands",
      city: "Yelgun",
      state: "NSW",
      latitude: -28.45,
      longitude: 153.55,
      startDate: new Date("2026-07-24T08:00:00Z"),
    };
    const b = {
      ...a,
      source: "ticketmaster",
      name: "Splendour In The Grass",
      startDate: new Date("2026-07-24T19:00:00Z"),
    };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("does NOT match different events at the same venue/day (false-positive guard)", () => {
    const a = {
      name: "Jazz Night at HOTA",
      source: "moshtix",
      venueName: "HOTA",
      city: "Surfers Paradise",
      state: "QLD",
      latitude: -28.0,
      longitude: 153.43,
      startDate: new Date("2026-06-12T19:00:00Z"),
    };
    const b = {
      ...a,
      source: "ticketmaster",
      name: "Comedy Showcase at HOTA",
    };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("does NOT match the same source against itself", () => {
    const a = {
      name: "Splendour in the Grass 2026",
      source: "ticketmaster",
      venueName: "Parklands",
      city: "Byron",
      state: "NSW",
      latitude: -28.45,
      longitude: 153.55,
      startDate: new Date("2026-07-24T19:00:00Z"),
    };
    expect(isDuplicate(a, { ...a, name: "Splendour In The Grass" })).toBe(false);
  });

  it("does NOT match events in different states even with similar names", () => {
    const a = {
      name: "Comedy Open Mic",
      source: "moshtix",
      venueName: "The Comic's Lounge",
      city: "Brisbane",
      state: "QLD",
      latitude: -27.47,
      longitude: 153.02,
      startDate: new Date("2026-06-12T19:00:00Z"),
    };
    const b = { ...a, source: "ticketmaster", state: "VIC", city: "Melbourne" };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("does NOT match events outside the ±12h window", () => {
    const a = {
      name: "Same Festival Day 1",
      source: "moshtix",
      venueName: "Park",
      city: "Byron",
      state: "NSW",
      latitude: -28.45,
      longitude: 153.55,
      startDate: new Date("2026-07-24T19:00:00Z"),
    };
    const b = {
      ...a,
      source: "ticketmaster",
      name: "Same Festival Day 2",
      startDate: new Date("2026-07-26T19:00:00Z"),
    };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("does NOT match when sim is 0.78-0.85 and there is no venue match", () => {
    // sim in [0.78, 0.85) only accepts when venueMatch is true.
    const a = {
      name: "Summer Beach Party Marathon",
      source: "moshtix",
      venueName: "Venue A",
      city: "Gold Coast",
      state: "QLD",
      latitude: -28.0,
      longitude: 153.4,
      startDate: new Date("2026-06-12T19:00:00Z"),
    };
    const b = {
      ...a,
      source: "ticketmaster",
      name: "Summer Beach Party Madness",
      venueName: "Venue B",
      latitude: -28.0,
      longitude: 153.5, // ~10km+ at this latitude — push out
    };
    // similarity is ~0.8 here; venue names differ; ensure we don't latch.
    // (Adjust coords so coordsMatch is false too.)
    b.latitude = -28.2; // ~22km away
    expect(isDuplicate(a, b)).toBe(false);
  });
});
