// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BandsintownAdapter } from "./bandsintown";
import { assertSampleQuality } from "../quality/event-quality";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/bandsintown-brisbane.json"),
  "utf8"
);

describe("BandsintownAdapter", () => {
  beforeEach(() => {
    process.env.BANDSINTOWN_APP_ID = "test-app-id";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BANDSINTOWN_APP_ID;
  });

  it("returns events that pass the QC quality bar", async () => {
    let firstCity = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      if (firstCity) {
        firstCity = false;
        return new Response(FIXTURE, { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });

    const events = await new BandsintownAdapter().fetch();
    expect(events.length).toBeGreaterThan(0);
    assertSampleQuality(events, {
      source: "bandsintown",
      sampleSize: 3,
      now: new Date("2026-05-13T00:00:00Z"),
    });
  });

  it("is a no-op when BANDSINTOWN_APP_ID is unset", async () => {
    delete process.env.BANDSINTOWN_APP_ID;
    const events = await new BandsintownAdapter().fetch();
    expect(events).toEqual([]);
  });
});
