import { describe, it, expect } from "vitest";
import { parseDateParam, formatDateLabel } from "./dateFilter";

describe("parseDateParam", () => {
  it("returns null for missing / invalid input", () => {
    expect(parseDateParam(undefined)).toBeNull();
    expect(parseDateParam(null)).toBeNull();
    expect(parseDateParam("")).toBeNull();
    expect(parseDateParam("not-a-date")).toBeNull();
    expect(parseDateParam("2026/05/08")).toBeNull();
    expect(parseDateParam("2026-5-8")).toBeNull();
    // SQL-injection-ish payloads must be rejected by the regex before reaching Prisma.
    expect(parseDateParam("2026-05-08'; DROP TABLE")).toBeNull();
  });

  it("returns a 24h UTC window for a valid YYYY-MM-DD", () => {
    const r = parseDateParam("2026-05-08");
    expect(r).not.toBeNull();
    expect(r!.dayStart.toISOString()).toBe("2026-05-08T00:00:00.000Z");
    expect(r!.dayEnd.toISOString()).toBe("2026-05-09T00:00:00.000Z");
    expect(r!.dayEnd.getTime() - r!.dayStart.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("formatDateLabel", () => {
  it("formats valid ISO dates as a friendly en-AU label", () => {
    // 2026-05-08 is a Friday (UTC).
    expect(formatDateLabel("2026-05-08")).toBe("Fri, 8 May");
  });

  it("returns the input unchanged for invalid dates", () => {
    expect(formatDateLabel("nonsense")).toBe("nonsense");
  });
});
