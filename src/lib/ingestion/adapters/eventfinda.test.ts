// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { EventfindaAdapter, pickEventfindaStart } from "./eventfinda";
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

  it("drops events whose only anchor is far in the past with no sessions", async () => {
    const stalePayload = JSON.stringify({
      events: [
        {
          id: 4001,
          name: "Long-past Trivia Night",
          description: "Weekly trivia.",
          url: "https://www.eventfinda.com.au/2025/long-past-trivia/brisbane",
          url_slug: "long-past-trivia",
          datetime_start: "2025-09-07 14:30:00",
          datetime_end: null,
          datetime_summary: "Sun 7 Sep 2025 2:30pm",
          is_free: true,
          is_cancelled: false,
          address: "Brisbane QLD",
          location_summary: "Brisbane, QLD",
          point: { lat: -27.47, lng: 153.02 },
          location: { name: "Trivia Pub", summary: "Brisbane, QLD" },
          category: { id: 12, name: "Community" },
          images: null,
          ticket_types: { ticket_types: [] },
          sessions: { sessions: [] },
          restrictions: null,
          presented_by: null,
        },
      ],
      "@attributes": { count: 1, rows: 100, page: 1, page_count: 1 },
    });

    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls++;
      if (calls === 1) return new Response(stalePayload, { status: 200 });
      return new Response("", { status: 404 });
    });
    vi.setSystemTime(new Date("2026-05-13T00:00:00Z"));

    const events = await new EventfindaAdapter().fetch();
    expect(events).toEqual([]);
  });
});

describe("pickEventfindaStart", () => {
  const now = new Date("2026-05-13T00:00:00Z");

  it("prefers the next-upcoming session when top-level start is stale", () => {
    const chosen = pickEventfindaStart(
      {
        datetime_start: "2025-09-07 14:30:00",
        datetime_end: "2026-10-04 18:30:00",
        sessions: {
          sessions: [
            { datetime_start: "2025-09-07 14:30:00", datetime_end: "2025-09-07 18:30:00" },
            { datetime_start: "2026-01-04 14:30:00", datetime_end: "2026-01-04 18:30:00" },
            { datetime_start: "2026-05-20 14:30:00", datetime_end: "2026-05-20 18:30:00" },
            { datetime_start: "2026-06-15 14:30:00", datetime_end: "2026-06-15 18:30:00" },
          ],
        },
      },
      now
    );
    expect(chosen).not.toBeNull();
    expect(chosen!.start).toBe("2026-05-20 14:30:00");
    expect(chosen!.end).toBe("2026-05-20 18:30:00");
  });

  it("skips cancelled sessions when picking the next session", () => {
    const chosen = pickEventfindaStart(
      {
        datetime_start: "2026-05-20 14:30:00",
        datetime_end: "2026-06-01 18:30:00",
        sessions: {
          sessions: [
            { datetime_start: "2026-05-20 14:30:00", is_cancelled: true },
            { datetime_start: "2026-06-01 14:30:00" },
          ],
        },
      },
      now
    );
    expect(chosen!.start).toBe("2026-06-01 14:30:00");
  });

  it("drops the event when every session and the top-level date are stale", () => {
    const chosen = pickEventfindaStart(
      {
        datetime_start: "2025-09-07 14:30:00",
        datetime_end: "2025-12-01 18:30:00",
        sessions: {
          sessions: [
            { datetime_start: "2025-09-07 14:30:00" },
            { datetime_start: "2025-12-01 14:30:00" },
          ],
        },
      },
      now
    );
    expect(chosen).toBeNull();
  });

  it("keeps an in-progress event whose endDate is still in the future", () => {
    const chosen = pickEventfindaStart(
      {
        datetime_start: "2026-05-10 10:00:00",
        datetime_end: "2026-05-20 22:00:00",
        sessions: null,
      },
      now
    );
    expect(chosen).not.toBeNull();
    expect(chosen!.start).toBe("2026-05-10 10:00:00");
    expect(chosen!.end).toBe("2026-05-20 22:00:00");
  });
});
