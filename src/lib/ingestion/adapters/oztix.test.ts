// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { OztixAdapter } from "./oztix";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/oztix-algolia.json"),
  "utf8"
);

describe("OztixAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dedups across states and clears the QC bar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    const events = await new OztixAdapter().fetch();
    // The fixture is served for every state slice; the three EventIds must
    // dedup to a single set.
    expect(events.length).toBe(3);
    assertSampleQuality(events, {
      source: "oztix",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events when Algolia errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const events = await new OztixAdapter().fetch();
    expect(events).toEqual([]);
  });
});
