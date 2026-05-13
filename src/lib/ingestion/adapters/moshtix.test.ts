// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { MoshtixAdapter } from "./moshtix";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/moshtix-search.html"),
  "utf8"
);

const NOW = new Date("2026-05-13T00:00:00Z");

describe("MoshtixAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("parses JSON-LD events, drops fully-past entries, clamps ongoing umbrellas, and decodes entities", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    const events = await new MoshtixAdapter().fetch();

    // Fixture has 6 events: 4 future (incl. one with HTML entities) +
    // 1 recurring-umbrella (stale start, future end — kept, start clamped) +
    // 1 fully-past (start and end both in 2024 — dropped).
    expect(events.length).toBe(5);
    expect(events.map((e) => e.name)).not.toContain("Long-Ago Gig");

    const decoded = events.find((e) => e.sourceId?.includes("360-back-n-forth-tour"));
    expect(decoded).toBeDefined();
    expect(decoded!.name).toBe("360 'BACK N FORTH' Tour & Afters");
    expect(decoded!.venueName).toBe("Lassù Mackay");
    expect(decoded!.venueAddress).toBe("1 Queen's Rd");

    const umbrella = events.find((e) => e.name === "Fashion Thrift Society (umbrella)");
    expect(umbrella).toBeDefined();
    expect(umbrella!.startDate.toISOString()).toBe("2026-05-13T00:00:00.000Z");
    expect(umbrella!.endDate?.toISOString()).toBe("2026-12-31T19:00:00.000Z");

    assertSampleQuality(events, {
      source: "moshtix",
      sampleSize: events.length,
      now: NOW,
    });
  });

  it("returns no events on a 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    expect(await new MoshtixAdapter().fetch()).toEqual([]);
  });
});
