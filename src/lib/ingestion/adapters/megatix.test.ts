// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { MegatixAdapter } from "./megatix";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/megatix-search.json"),
  "utf8"
);

describe("MegatixAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("walks the listing and clears the QC bar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    const events = await new MegatixAdapter().fetch();
    expect(events.length).toBe(3);
    assertSampleQuality(events, {
      source: "megatix",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events when the listing endpoint errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const events = await new MegatixAdapter().fetch();
    expect(events).toEqual([]);
  });
});
