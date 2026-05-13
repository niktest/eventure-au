// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
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

describe("MoshtixAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses JSON-LD events and clears the QC bar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    const events = await new MoshtixAdapter().fetch();
    expect(events.length).toBe(3);
    assertSampleQuality(events, {
      source: "moshtix",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events on a 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    expect(await new MoshtixAdapter().fetch()).toEqual([]);
  });
});
