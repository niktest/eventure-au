import { describe, it, expect } from "vitest";
import {
  isTimeWindowKey,
  resolveTimeWindow,
  TIME_WINDOW_KEYS,
} from "./timeWindows";

const SYDNEY = "Australia/Sydney";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe("isTimeWindowKey", () => {
  it("accepts the documented keys and rejects others", () => {
    for (const k of TIME_WINDOW_KEYS) expect(isTimeWindowKey(k)).toBe(true);
    expect(isTimeWindowKey("yesterday")).toBe(false);
    expect(isTimeWindowKey(null)).toBe(false);
    expect(isTimeWindowKey(undefined)).toBe(false);
  });
});

describe("resolveTimeWindow (Australia/Sydney)", () => {
  // 2026-05-13 is a Wednesday. Sydney is AEST (UTC+10) in May.
  const wedMay13 = new Date("2026-05-13T08:00:00.000Z"); // 18:00 Sydney

  it("today resolves to midnight-to-midnight in Sydney", () => {
    const { start, end } = resolveTimeWindow("today", wedMay13, SYDNEY);
    expect(start.toISOString()).toBe("2026-05-12T14:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-13T14:00:00.000Z");
  });

  it("tomorrow resolves to the next Sydney day", () => {
    const { start, end } = resolveTimeWindow("tomorrow", wedMay13, SYDNEY);
    expect(start.toISOString()).toBe("2026-05-13T14:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-14T14:00:00.000Z");
  });

  it("next7 spans seven Sydney days", () => {
    const { start, end } = resolveTimeWindow("next7", wedMay13, SYDNEY);
    expect(start.toISOString()).toBe("2026-05-12T14:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-19T14:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(7 * DAY_MS);
  });

  it("month runs to the start of next Sydney month", () => {
    const { start, end } = resolveTimeWindow("month", wedMay13, SYDNEY);
    expect(start.toISOString()).toBe("2026-05-12T14:00:00.000Z");
    // 1 June 2026 00:00 Sydney (still AEST) = 31 May 14:00 UTC.
    expect(end.toISOString()).toBe("2026-05-31T14:00:00.000Z");
  });

  it("month rolls into next year for December", () => {
    const dec = new Date("2026-12-10T03:00:00.000Z"); // Dec 10 Sydney (AEDT, +11)
    const { end } = resolveTimeWindow("month", dec, SYDNEY);
    // 1 Jan 2027 00:00 Sydney (AEDT +11) = 31 Dec 13:00 UTC.
    expect(end.toISOString()).toBe("2026-12-31T13:00:00.000Z");
  });

  describe("weekend window (Fri-Sun, ends at Mon 00:00 Sydney)", () => {
    it("on a Wednesday points at the upcoming Fri-Mon", () => {
      const { start, end } = resolveTimeWindow("weekend", wedMay13, SYDNEY);
      // Fri 15 May 00:00 Sydney = Thu 14 May 14:00 UTC.
      expect(start.toISOString()).toBe("2026-05-14T14:00:00.000Z");
      // Mon 18 May 00:00 Sydney = Sun 17 May 14:00 UTC.
      expect(end.toISOString()).toBe("2026-05-17T14:00:00.000Z");
    });

    it("on a Friday starts today", () => {
      const fri = new Date("2026-05-15T02:00:00.000Z"); // Fri May 15 12:00 Sydney
      const { start, end } = resolveTimeWindow("weekend", fri, SYDNEY);
      expect(start.toISOString()).toBe("2026-05-14T14:00:00.000Z");
      expect(end.toISOString()).toBe("2026-05-17T14:00:00.000Z");
    });

    it("on a Sunday narrows to today-only", () => {
      const sun = new Date("2026-05-17T02:00:00.000Z"); // Sun May 17 12:00 Sydney
      const { start, end } = resolveTimeWindow("weekend", sun, SYDNEY);
      expect(start.toISOString()).toBe("2026-05-16T14:00:00.000Z");
      expect(end.toISOString()).toBe("2026-05-17T14:00:00.000Z");
    });

    it("on a Monday points at the upcoming Fri-Mon", () => {
      const mon = new Date("2026-05-11T02:00:00.000Z"); // Mon May 11 12:00 Sydney
      const { start, end } = resolveTimeWindow("weekend", mon, SYDNEY);
      expect(start.toISOString()).toBe("2026-05-14T14:00:00.000Z");
      expect(end.toISOString()).toBe("2026-05-17T14:00:00.000Z");
    });
  });

  describe("DST transitions", () => {
    // 2026-10-04 is the first Sunday of October — clocks jump forward 02:00 → 03:00.
    it("today spans 23 hours across the spring-forward boundary", () => {
      const noonSydDstStart = new Date("2026-10-04T01:00:00.000Z"); // 12:00 Syd AEDT
      const { start, end } = resolveTimeWindow(
        "today",
        noonSydDstStart,
        SYDNEY,
      );
      expect(end.getTime() - start.getTime()).toBe(23 * HOUR_MS);
    });

    // 2026-04-05 is the first Sunday of April — clocks fall back 03:00 → 02:00.
    it("today spans 25 hours across the fall-back boundary", () => {
      const noonSydDstEnd = new Date("2026-04-05T02:00:00.000Z"); // 13:00 Syd AEDT
      const { start, end } = resolveTimeWindow(
        "today",
        noonSydDstEnd,
        SYDNEY,
      );
      expect(end.getTime() - start.getTime()).toBe(25 * HOUR_MS);
    });

    it("weekend over the fall-back boundary still ends at Mon 00:00", () => {
      // Friday 3 April 2026 is the Friday before the fall-back Sunday.
      const fri = new Date("2026-04-03T02:00:00.000Z");
      const { start, end } = resolveTimeWindow("weekend", fri, SYDNEY);
      // Fri 3 Apr 00:00 AEDT (+11) = 2 Apr 13:00 UTC.
      expect(start.toISOString()).toBe("2026-04-02T13:00:00.000Z");
      // Mon 6 Apr 00:00 AEST (+10, after DST end) = 5 Apr 14:00 UTC.
      expect(end.toISOString()).toBe("2026-04-05T14:00:00.000Z");
    });
  });
});
