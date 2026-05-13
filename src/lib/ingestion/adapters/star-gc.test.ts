// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  StarGCAdapter,
  collectListingItems,
  extractDrupalSettings,
  parseStarDate,
} from "./star-gc";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const LISTING = readFileSync(
  join(__dirnameLocal, "__fixtures__/star-gc-listing.html"),
  "utf8"
);
const DETAIL_MOVIES = readFileSync(
  join(__dirnameLocal, "__fixtures__/star-gc-detail-movies.html"),
  "utf8"
);

describe("parseStarDate", () => {
  it("treats naïve datetime as Brisbane (UTC+10)", () => {
    // 13:00 in Brisbane = 03:00 UTC.
    expect(parseStarDate("2026-05-16T13:00:00")?.toISOString()).toBe(
      "2026-05-16T03:00:00.000Z"
    );
  });

  it("preserves explicit offset", () => {
    expect(parseStarDate("2026-05-16T13:00:00+10:00")?.toISOString()).toBe(
      "2026-05-16T03:00:00.000Z"
    );
  });

  it("rejects nonsense", () => {
    expect(parseStarDate("")).toBeNull();
    expect(parseStarDate("not-a-date")).toBeNull();
  });
});

describe("collectListingItems", () => {
  it("walks generic_tabs + whats_on_portrait and tags items by tab", () => {
    const settings = extractDrupalSettings(LISTING);
    expect(settings).not.toBeNull();
    const items = collectListingItems(settings!);
    expect(items.length).toBeGreaterThan(5);

    // Aliases under /goldcoast/whats-on/ should dominate.
    const aliases = items.map((i) => i.alias);
    expect(aliases.some((a) => a.startsWith("/goldcoast/whats-on/"))).toBe(true);

    // Hotel/page bundles (e.g. /hotels-and-spa/the-darling) must NOT appear —
    // those are venue pages, not events.
    expect(aliases.every((a) => !a.includes("/hotels-and-spa/"))).toBe(true);
  });
});

describe("StarGCAdapter (HTML fixtures)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns events with dates, images, and category from the live model", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/goldcoast/whats-on")) {
        return new Response(LISTING, { status: 200 });
      }
      // Serve the same detail fixture for every event detail page so the
      // adapter exercises its detail parser without hitting the network.
      return new Response(DETAIL_MOVIES, { status: 200 });
    });

    const events = await new StarGCAdapter().fetch();
    expect(events.length).toBeGreaterThan(0);

    const sample = events[0];
    expect(sample.name).toBeTruthy();
    expect(sample.startDate).toBeInstanceOf(Date);
    expect(sample.url).toMatch(/^https:\/\/www\.star\.com\.au\/goldcoast\//);
    expect(sample.imageUrl).toMatch(/^https:\/\//);
    expect(sample.city).toBe("Gold Coast");
    expect(sample.state).toBe("QLD");
    expect(sample.venueName).toBe("The Star Gold Coast");
  });

  it("returns no events when listing fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const events = await new StarGCAdapter().fetch();
    expect(events).toEqual([]);
  });

  // QC rule (EVE-197): sampled events from this adapter must clear the
  // shared event-quality validator.
  it("produces sample events that pass the QC quality bar", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/goldcoast/whats-on")) {
        return new Response(LISTING, { status: 200 });
      }
      return new Response(DETAIL_MOVIES, { status: 200 });
    });
    const events = await new StarGCAdapter().fetch();
    assertSampleQuality(events, { source: "star-gc", sampleSize: 3 });
  });
});
