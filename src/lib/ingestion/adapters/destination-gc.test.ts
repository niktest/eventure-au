// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DestinationGCAdapter, parseExperienceGCDate } from "./destination-gc";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirnameLocal, "__fixtures__/destination-gc-entertainment.html"),
  "utf8"
);

describe("parseExperienceGCDate", () => {
  const NOW = new Date("2026-05-08T00:00:00Z");

  it("parses a single dated event", () => {
    const r = parseExperienceGCDate("16 May 2026", NOW);
    expect(r?.start.toISOString()).toBe("2026-05-16T00:00:00.000Z");
    expect(r?.end).toBeUndefined();
  });

  it("parses zero-padded day", () => {
    const r = parseExperienceGCDate("09 May 2026", NOW);
    expect(r?.start.toISOString()).toBe("2026-05-09T00:00:00.000Z");
  });

  it("parses a date range", () => {
    const r = parseExperienceGCDate("14 May 2026 - 17 May 2026", NOW);
    expect(r?.start.toISOString()).toBe("2026-05-14T00:00:00.000Z");
    expect(r?.end?.toISOString()).toBe("2026-05-17T00:00:00.000Z");
  });

  it('treats "From now until X" as ongoing with start=now', () => {
    const r = parseExperienceGCDate("From now until 16 May 2026", NOW);
    expect(r?.start).toEqual(NOW);
    expect(r?.end?.toISOString()).toBe("2026-05-16T00:00:00.000Z");
  });

  it("rejects undated weekly recurrences", () => {
    expect(parseExperienceGCDate("Saturday (Weekly)", NOW)).toBeNull();
    expect(parseExperienceGCDate("Sunday (Weekly)", NOW)).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseExperienceGCDate("", NOW)).toBeNull();
  });
});

describe("DestinationGCAdapter (HTML fixture)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts events from the entertainment category page", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/events/entertainment")) {
        return new Response(FIXTURE, { status: 200 });
      }
      return new Response("", { status: 404 });
    });

    const events = await new DestinationGCAdapter().fetch();
    expect(fetchSpy).toHaveBeenCalled();
    expect(events.length).toBeGreaterThan(5);

    const ross = events.find((e) => /Ross Noble/i.test(e.name));
    expect(ross).toBeDefined();
    expect(ross?.url).toContain("/events/ross-noble");
    expect(ross?.city).toBe("Gold Coast");
    expect(ross?.state).toBe("QLD");
    expect(ross?.category).toBe("ARTS");
    expect(ross?.imageUrl).toMatch(/^https:\/\//);
    expect(ross?.ticketUrl).toContain("tickets.hota.com.au");
  });

  it("returns no events when all category pages 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    const events = await new DestinationGCAdapter().fetch();
    expect(events).toEqual([]);
  });
});
