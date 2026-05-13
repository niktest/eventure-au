// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { EventbriteAdapter, parseEventbriteEvents } from "./eventbrite";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/eventbrite-brisbane.html"),
  "utf8"
);

describe("parseEventbriteEvents", () => {
  it("extracts events from the JSON-LD ItemList payload", () => {
    const events = parseEventbriteEvents(FIXTURE, "Brisbane", "QLD");
    expect(events.length).toBeGreaterThan(0);

    const first = events[0];
    expect(first.name).toBeTruthy();
    expect(first.url).toMatch(/^https:\/\/www\.eventbrite\.com\.au\/e\//);
    expect(first.startDate).toBeInstanceOf(Date);
    expect(first.sourceId).toBe(first.url);
    expect(first.ticketProvider).toBe("eventbrite");
  });

  it("upgrades img.evbuc.com thumbnails to cdn.evbuc.com originals", () => {
    const events = parseEventbriteEvents(FIXTURE, "Brisbane", "QLD");
    const withImage = events.find((e) => !!e.imageUrl);
    expect(withImage?.imageUrl).toMatch(/^https:\/\/cdn\.evbuc\.com\/images\//);
    expect(withImage?.imageUrl).not.toMatch(/img\.evbuc\.com/);
  });

  it("falls back to fallback city/state when address is missing", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          item: {
            "@type": "Event",
            name: "Edge Case",
            url: "https://www.eventbrite.com.au/e/edge-case-tickets-999",
            startDate: "2026-06-01",
          },
        },
      ],
    })}</script>`;
    const events = parseEventbriteEvents(html, "Brisbane", "QLD");
    expect(events).toHaveLength(1);
    expect(events[0].city).toBe("Brisbane");
    expect(events[0].state).toBe("QLD");
  });

  it("returns empty array when no JSON-LD is present", () => {
    expect(parseEventbriteEvents("<html><body>no events</body></html>", "Brisbane", "QLD")).toEqual([]);
  });

  it("ignores malformed JSON-LD blocks", () => {
    const html = '<script type="application/ld+json">{not json</script>';
    expect(parseEventbriteEvents(html, "Brisbane", "QLD")).toEqual([]);
  });

  // QC rule (EVE-197): sampled events from this adapter must clear the
  // shared event-quality validator. This protects against regressions in
  // thumbnail-vs-full-res images, fabricated dates, HTML-in-description, etc.
  it("produces sample events that pass the QC quality bar", () => {
    const events = parseEventbriteEvents(FIXTURE, "Brisbane", "QLD");
    assertSampleQuality(events, { source: "eventbrite", sampleSize: 3 });
  });
});

describe("EventbriteAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EVENTBRITE_URL;
  });

  it("scrapes every city listing and deduplicates events", async () => {
    process.env.EVENTBRITE_URL = "https://example.test";
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push(url);
      // Return the Brisbane fixture for every city so we can assert dedup.
      return new Response(FIXTURE, { status: 200 });
    });

    const events = await new EventbriteAdapter().fetch();
    expect(calls.length).toBeGreaterThan(1);
    expect(calls[0]).toBe("https://example.test/d/australia--brisbane/events/");
    expect(events.length).toBeGreaterThan(0);

    // Every fixture page exposes the same events, so dedup should keep one copy.
    const ids = new Set(events.map((e) => e.sourceId));
    expect(ids.size).toBe(events.length);
  });

  it("skips a city when its page returns a non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    const events = await new EventbriteAdapter().fetch();
    expect(events).toEqual([]);
  });

  it("never calls the Eventbrite v3 API", async () => {
    const seen: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      seen.push(typeof input === "string" ? input : input.toString());
      return new Response(FIXTURE, { status: 200 });
    });
    await new EventbriteAdapter().fetch();
    expect(seen.every((u) => !u.includes("eventbriteapi.com"))).toBe(true);
  });
});
