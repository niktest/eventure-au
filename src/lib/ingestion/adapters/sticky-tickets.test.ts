// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { StickyTicketsAdapter } from "./sticky-tickets";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/sticky-tickets.json"),
  "utf8"
);

describe("StickyTicketsAdapter", () => {
  beforeEach(() => {
    process.env.STICKY_TICKETS_TOKEN = "test-token";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STICKY_TICKETS_TOKEN;
  });

  it("returns events that clear the QC bar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(FIXTURE, { status: 200 }));
    const events = await new StickyTicketsAdapter().fetch();
    expect(events.length).toBeGreaterThan(0);
    assertSampleQuality(events, {
      source: "stickytickets",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("is a no-op without the API token", async () => {
    delete process.env.STICKY_TICKETS_TOKEN;
    const events = await new StickyTicketsAdapter().fetch();
    expect(events).toEqual([]);
  });
});
