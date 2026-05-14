import { describe, expect, it } from "vitest";
import {
  WINDOW_SIZE,
  WINDOW_HALF,
  addMonths,
  advanceAnchor,
  buildMonthGrid,
  densityLevel,
  initRingState,
  isMonthInWindow,
  monthDiff,
  parseMonthKey,
  slotForMonth,
  windowRange,
} from "./monthRing";

describe("monthRing — month arithmetic", () => {
  it("addMonths handles year wrap forward and back", () => {
    expect(addMonths("2026-05", 0)).toBe("2026-05");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-05", 14)).toBe("2027-07");
    expect(addMonths("2026-05", -25)).toBe("2024-04");
  });

  it("monthDiff is signed and consistent", () => {
    expect(monthDiff("2026-07", "2026-05")).toBe(2);
    expect(monthDiff("2026-05", "2026-07")).toBe(-2);
    expect(monthDiff("2027-01", "2026-12")).toBe(1);
  });

  it("parseMonthKey returns 1-based month", () => {
    expect(parseMonthKey("2026-05")).toEqual({ year: 2026, month: 5 });
  });
});

describe("monthRing — initial state and window", () => {
  it("initRingState binds slots chronologically around the anchor", () => {
    const s = initRingState("2026-05");
    expect(s.slotMonthKey).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(s.anchorMonthKey).toBe("2026-05");
    expect(s.rebindVersion).toEqual(new Array(WINDOW_SIZE).fill(0));
  });

  it("windowRange returns WINDOW_SIZE chronological months", () => {
    expect(windowRange("2026-05")).toHaveLength(WINDOW_SIZE);
    expect(windowRange("2026-05")[WINDOW_HALF]).toBe("2026-05");
  });
});

describe("monthRing — recycle invariants", () => {
  it("advancing by one month rebinds exactly one slot", () => {
    const s0 = initRingState("2026-05");
    const s1 = advanceAnchor(s0, "2026-06");
    const rebound = s1.rebindVersion.filter((v, i) => v !== s0.rebindVersion[i]);
    expect(rebound).toHaveLength(1);
    // The new window is 2026-03..2026-09; 2026-02 left, 2026-09 arrived.
    expect(s1.slotMonthKey.sort()).toEqual(windowRange("2026-06").sort());
  });

  it("advancing within window keeps DOM identity for kept months", () => {
    const s0 = initRingState("2026-05");
    const s1 = advanceAnchor(s0, "2026-06");
    // Each kept month must be in the same slot it was before.
    for (const m of windowRange("2026-06")) {
      const beforeIdx = s0.slotMonthKey.indexOf(m);
      const afterIdx = s1.slotMonthKey.indexOf(m);
      if (beforeIdx !== -1) {
        expect(afterIdx).toBe(beforeIdx);
      }
    }
  });

  it("advancing by >= WINDOW_SIZE months rebinds every slot once", () => {
    const s0 = initRingState("2026-05");
    const s1 = advanceAnchor(s0, "2028-01"); // far away
    expect(s1.slotMonthKey.length).toBe(WINDOW_SIZE);
    expect(new Set(s1.slotMonthKey).size).toBe(WINDOW_SIZE);
    // every slot rebound exactly once
    s1.rebindVersion.forEach((v) => expect(v).toBe(1));
  });

  it("no slot growth after 1000 scroll ticks (memory invariant)", () => {
    let s = initRingState("2026-05");
    for (let i = 1; i <= 1000; i++) {
      s = advanceAnchor(s, addMonths("2026-05", i));
      expect(s.slotMonthKey.length).toBe(WINDOW_SIZE);
      expect(s.rebindVersion.length).toBe(WINDOW_SIZE);
    }
  });

  it("advanceAnchor is a no-op when anchor unchanged", () => {
    const s0 = initRingState("2026-05");
    const s1 = advanceAnchor(s0, "2026-05");
    expect(s1).toBe(s0);
  });
});

describe("monthRing — window queries", () => {
  it("isMonthInWindow / slotForMonth", () => {
    const s = initRingState("2026-05");
    expect(isMonthInWindow(s, "2026-05")).toBe(true);
    expect(isMonthInWindow(s, "2026-08")).toBe(true);
    expect(isMonthInWindow(s, "2026-09")).toBe(false);
    expect(slotForMonth(s, "2026-05")).toBe(WINDOW_HALF);
    expect(slotForMonth(s, "2025-12")).toBe(-1);
  });
});

describe("monthRing — buildMonthGrid", () => {
  it("returns a 42-cell grid with leading pad and trailing pad", () => {
    // May 2026: 1st is a Friday → ISO weekday 4. Pad 4 leading cells.
    const grid = buildMonthGrid("2026-05");
    expect(grid.length).toBe(42);
    for (let i = 0; i < 4; i++) {
      expect(grid[i]!.date).toBeNull();
    }
    expect(grid[4]!.date).toBe("2026-05-01");
    expect(grid[4]!.day).toBe(1);
    // Day 31 of May 2026 lands at index 4 + 30 = 34.
    expect(grid[34]!.date).toBe("2026-05-31");
    // Trailing pad cells are null.
    expect(grid[35]!.date).toBeNull();
  });

  it("Feb 2024 (leap) has 29 day cells", () => {
    const grid = buildMonthGrid("2024-02");
    const dated = grid.filter((c) => c.date !== null);
    expect(dated.length).toBe(29);
  });

  it("Feb 2026 (non-leap) has 28 day cells", () => {
    const grid = buildMonthGrid("2026-02");
    const dated = grid.filter((c) => c.date !== null);
    expect(dated.length).toBe(28);
  });
});

describe("monthRing — density bucketing", () => {
  it("buckets counts into 0/low/med/high", () => {
    expect(densityLevel(0)).toBe(0);
    expect(densityLevel(1)).toBe(1);
    expect(densityLevel(2)).toBe(1);
    expect(densityLevel(3)).toBe(2);
    expect(densityLevel(6)).toBe(2);
    expect(densityLevel(7)).toBe(3);
    expect(densityLevel(99)).toBe(3);
  });
});
