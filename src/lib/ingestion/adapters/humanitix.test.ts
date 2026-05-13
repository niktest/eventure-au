// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { HumanitixAdapter } from "./humanitix";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/humanitix-carousels.json"),
  "utf8"
);

describe("HumanitixAdapter", () => {
  beforeEach(() => {
    // Humanitix sleeps 200ms between pages; fake timers keep the test fast.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns events that clear the QC bar", async () => {
    let firstResponse = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      // First request serves a non-empty payload; everything else returns an
      // empty array so each city's pagination loop terminates immediately.
      if (firstResponse) {
        firstResponse = false;
        return new Response(FIXTURE, { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });

    const events = await new HumanitixAdapter().fetch();
    expect(events.length).toBeGreaterThan(0);
    assertSampleQuality(events, {
      source: "humanitix",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events when the API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const events = await new HumanitixAdapter().fetch();
    expect(events).toEqual([]);
  });
});
