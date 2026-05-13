// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  VisitBrisbaneAdapter,
  extractEventEntries,
} from "./visit-brisbane";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const read = (name: string) =>
  readFileSync(join(__dirnameLocal, "__fixtures__", name), "utf8");
const SITEMAP = read("visit-brisbane-sitemap.xml");
const EVENT_A = read("visit-brisbane-event-a.html");
const EVENT_B = read("visit-brisbane-event-b.html");
const EVENT_C = read("visit-brisbane-event-c.html");
const EVENT_STALE = read("visit-brisbane-event-stale.html");

const BASE = "https://visit.brisbane.qld.au";

function mockResponses(routes: Record<string, string>) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
    const body = routes[url];
    if (body === undefined) {
      return Promise.resolve(new Response("not found", { status: 404 }));
    }
    return Promise.resolve(new Response(body, { status: 200 }));
  });
}

describe("extractEventEntries", () => {
  it("returns only `/whats-on/<loc>/<cat>/<slug>` URLs, sorted by lastmod desc", () => {
    const entries = extractEventEntries(SITEMAP, BASE);
    expect(entries.map((e) => e.url)).toEqual([
      `${BASE}/whats-on/eastern-suburbs/eat-and-drink-events/adventurefest-mick-the-camp-oven-cook-e210`,
      `${BASE}/whats-on/eastern-suburbs/eat-and-drink-events/adventurefest-friday-story-time-3b26`,
      `${BASE}/whats-on/eastern-suburbs/eat-and-drink-events/basic-buttercream-class-2318`,
      `${BASE}/whats-on/brisbane/eat-and-drink-events/devonshire-tea-5f33`,
    ]);
  });

  it("skips category index pages and the listing root", () => {
    const entries = extractEventEntries(SITEMAP, BASE);
    expect(entries.find((e) => e.url === `${BASE}/whats-on`)).toBeUndefined();
    expect(entries.find((e) => e.url === `${BASE}/`)).toBeUndefined();
  });
});

describe("VisitBrisbaneAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("walks the sitemap, parses JSON-LD, drops the stale event, and clears QC", async () => {
    mockResponses({
      [`${BASE}/sitemap.xml`]: SITEMAP,
      [`${BASE}/whats-on/eastern-suburbs/eat-and-drink-events/adventurefest-friday-story-time-3b26`]:
        EVENT_A,
      [`${BASE}/whats-on/eastern-suburbs/eat-and-drink-events/adventurefest-mick-the-camp-oven-cook-e210`]:
        EVENT_B,
      [`${BASE}/whats-on/eastern-suburbs/eat-and-drink-events/basic-buttercream-class-2318`]:
        EVENT_C,
      [`${BASE}/whats-on/brisbane/eat-and-drink-events/devonshire-tea-5f33`]:
        EVENT_STALE,
    });

    const events = await new VisitBrisbaneAdapter().fetch();
    // 3 live events; the 2023 placeholder row is filtered.
    expect(events).toHaveLength(3);
    const names = events.map((e) => e.name).sort();
    expect(names).toEqual([
      "AdventureFest Friday Story Time Fun at Capalaba Library",
      "AdventureFest: Mick, the Camp Oven Cook",
      "Basic Buttercream Class",
    ]);

    // Image upgrade: w=800 listing-thumb param is rewritten to w=1920, h dropped.
    const a = events.find((e) => e.name.startsWith("AdventureFest Friday"))!;
    expect(a.imageUrl).toContain("w=1920");
    expect(a.imageUrl).not.toContain("h=450");
    expect(a.imageUrl).not.toContain("w=800");

    // Description with HTML is stripped before upsert.
    const c = events.find((e) => e.name === "Basic Buttercream Class")!;
    expect(c.description).not.toMatch(/<[^>]+>/);
    expect(c.description).toContain("absolute beginners");

    assertSampleQuality(events, {
      source: "visitbrisbane",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events when the sitemap fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 500 })
    );
    expect(await new VisitBrisbaneAdapter().fetch()).toEqual([]);
  });
});
