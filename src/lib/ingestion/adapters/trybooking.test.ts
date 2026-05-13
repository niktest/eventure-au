// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { TryBookingAdapter } from "./trybooking";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/trybooking-search.json"),
  "utf8"
);

describe("TryBookingAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dedups across city loops and clears the QC bar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    const events = await new TryBookingAdapter().fetch();
    // Three distinct event ids regardless of how many cities serve the fixture.
    expect(events.length).toBe(3);
    assertSampleQuality(events, {
      source: "trybooking",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events when the search endpoint errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const events = await new TryBookingAdapter().fetch();
    expect(events).toEqual([]);
  });
});
