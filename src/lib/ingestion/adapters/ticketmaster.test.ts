// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { TicketmasterAdapter } from "./ticketmaster";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/ticketmaster-au.json"),
  "utf8"
);

describe("TicketmasterAdapter", () => {
  beforeEach(() => {
    process.env.TICKETMASTER_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TICKETMASTER_API_KEY;
  });

  it("dedups across segments and clears the QC bar", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(FIXTURE, { status: 200 })
    );
    const events = await new TicketmasterAdapter().fetch();
    // Same fixture served across all five classification segments must dedup
    // to the three distinct event ids.
    expect(events.length).toBe(3);
    assertSampleQuality(events, {
      source: "ticketmaster",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("is a no-op without an API key", async () => {
    delete process.env.TICKETMASTER_API_KEY;
    const events = await new TicketmasterAdapter().fetch();
    expect(events).toEqual([]);
  });
});
