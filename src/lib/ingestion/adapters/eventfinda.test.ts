// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { EventfindaAdapter } from "./eventfinda";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/eventfinda-brisbane.json"),
  "utf8"
);

describe("EventfindaAdapter", () => {
  beforeEach(() => {
    process.env.EVENTFINDA_USERNAME = "u";
    process.env.EVENTFINDA_PASSWORD = "p";
    // Eventfinda sleeps 1.1s after each successful page; fake timers keep the
    // test under the vitest 5s default by fast-forwarding.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.EVENTFINDA_USERNAME;
    delete process.env.EVENTFINDA_PASSWORD;
  });

  it("returns events that clear the QC bar", async () => {
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls++;
      // Serve the fixture for the first city only; later cities 404 so the
      // adapter terminates without burning per-city delay loops.
      if (calls === 1) return new Response(FIXTURE, { status: 200 });
      return new Response("", { status: 404 });
    });

    const events = await new EventfindaAdapter().fetch();
    expect(events.length).toBeGreaterThan(0);
    assertSampleQuality(events, {
      source: "eventfinda",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("is a no-op when credentials are missing", async () => {
    delete process.env.EVENTFINDA_USERNAME;
    const events = await new EventfindaAdapter().fetch();
    expect(events).toEqual([]);
  });
});
