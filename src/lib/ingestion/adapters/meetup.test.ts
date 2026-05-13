// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { MeetupAdapter } from "./meetup";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/meetup-brisbane.json"),
  "utf8"
);

describe("MeetupAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses recommendedEvents and clears the QC quality bar", async () => {
    let firstCity = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      // First city returns events; subsequent cities return an empty page so
      // the adapter terminates quickly.
      if (firstCity) {
        firstCity = false;
        return new Response(FIXTURE, { status: 200 });
      }
      return new Response(
        JSON.stringify({
          data: { recommendedEvents: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
        }),
        { status: 200 }
      );
    });

    const events = await new MeetupAdapter().fetch();
    expect(events.length).toBeGreaterThan(0);
    assertSampleQuality(events, {
      source: "meetup",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("returns no events when the GraphQL endpoint errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const events = await new MeetupAdapter().fetch();
    expect(events).toEqual([]);
  });
});
