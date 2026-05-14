/**
 * Ring-buffer state model for the event calendar (EVE-232, wireframes EVE-228).
 *
 * Invariants:
 *   - Exactly `WINDOW_SIZE` slots exist for the lifetime of the calendar.
 *   - Slot identity is stable (slot index = React key); only its `monthKey` binding
 *     changes when the anchor moves.
 *   - Selection (`selectedDateKey`) and focus (`focusedDateKey`) live above the
 *     ring; rebinding a slot never clears them.
 *
 * The window covers `[anchor - HALF, anchor + HALF]` months — default 3, so 7 tiles.
 */

export const WINDOW_HALF = 3;
export const WINDOW_SIZE = WINDOW_HALF * 2 + 1;

export type MonthKey = string; // "YYYY-MM"

export type RingState = {
  /** Current anchor month — the month the user is "looking at". */
  anchorMonthKey: MonthKey;
  /** monthKey bound to each slot (length === WINDOW_SIZE). */
  slotMonthKey: MonthKey[];
  /** Monotonic counter per slot, bumped on rebind. Drives a11y re-announce. */
  rebindVersion: number[];
};

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: Number(y), month: Number(m) };
}

export function formatMonthKey(year: number, month1Based: number): MonthKey {
  return `${year}-${String(month1Based).padStart(2, "0")}`;
}

export function monthKeyOf(date: Date): MonthKey {
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1);
}

/** Offset month key by N months (N can be negative). */
export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  // Convert to absolute month index, then back.
  const idx = year * 12 + (month - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = ((idx % 12) + 12) % 12;
  return formatMonthKey(ny, nm + 1);
}

/** Signed month delta a - b (months). */
export function monthDiff(a: MonthKey, b: MonthKey): number {
  const A = parseMonthKey(a);
  const B = parseMonthKey(b);
  return (A.year - B.year) * 12 + (A.month - B.month);
}

/** Build initial ring state anchored at `anchor`. Slots laid out chronologically. */
export function initRingState(anchor: MonthKey): RingState {
  const slotMonthKey: MonthKey[] = [];
  for (let i = 0; i < WINDOW_SIZE; i++) {
    slotMonthKey.push(addMonths(anchor, i - WINDOW_HALF));
  }
  return {
    anchorMonthKey: anchor,
    slotMonthKey,
    rebindVersion: new Array(WINDOW_SIZE).fill(0),
  };
}

/** Range of monthKeys covered by the current window, chronological order. */
export function windowRange(anchor: MonthKey): MonthKey[] {
  return Array.from({ length: WINDOW_SIZE }, (_, i) =>
    addMonths(anchor, i - WINDOW_HALF)
  );
}

/**
 * Move the anchor to a new month, recycling slots whose current month leaves
 * the window. Slots that still hold an in-window month keep their binding —
 * this preserves DOM identity for the unchanged tiles and is what makes the
 * ring buffer cheap (we only rebind |delta| slots for a |delta|-month shift,
 * up to the full window).
 */
export function advanceAnchor(state: RingState, nextAnchor: MonthKey): RingState {
  if (nextAnchor === state.anchorMonthKey) return state;

  const nextWindow = new Set(windowRange(nextAnchor));
  const slotMonthKey = state.slotMonthKey.slice();
  const rebindVersion = state.rebindVersion.slice();

  // Step 1: mark slots whose current month is now out-of-window as "free".
  // Step 2: collect the set of months in the new window that aren't already
  //         bound to any slot — these need fresh bindings.
  const heldByOtherSlot = new Set(
    slotMonthKey.filter((m) => nextWindow.has(m))
  );
  const missingMonths = windowRange(nextAnchor).filter(
    (m) => !heldByOtherSlot.has(m)
  );

  // Walk slots in order; rebind any free slot to the next missing month.
  let cursor = 0;
  for (let i = 0; i < WINDOW_SIZE; i++) {
    if (!nextWindow.has(slotMonthKey[i]!)) {
      const next = missingMonths[cursor++];
      if (next === undefined) {
        // Shouldn't happen: missingMonths.length === number of out-of-window slots.
        continue;
      }
      slotMonthKey[i] = next;
      rebindVersion[i] = (rebindVersion[i] ?? 0) + 1;
    }
  }

  return {
    anchorMonthKey: nextAnchor,
    slotMonthKey,
    rebindVersion,
  };
}

/** True iff the given date's month is inside the current window. */
export function isMonthInWindow(state: RingState, monthKey: MonthKey): boolean {
  return state.slotMonthKey.includes(monthKey);
}

/** The slot index currently holding `monthKey`, or -1. */
export function slotForMonth(state: RingState, monthKey: MonthKey): number {
  return state.slotMonthKey.indexOf(monthKey);
}

// ---------- Day grid helpers (Monday-first, ISO weekday) ----------

export type DayCell = {
  /** ISO YYYY-MM-DD or null for leading/trailing pad cells. */
  date: string | null;
  /** day-of-month 1-31, or null when `date` is null. */
  day: number | null;
  /** weekday index 0..6 (Mon..Sun). */
  weekday: number;
};

/**
 * Build the Monday-first 6×7 day grid for a given month. Pad cells outside
 * the month are returned as `null` rather than as adjacent-month days — the
 * wireframes show empty pad cells, and rendering empty cells avoids
 * misleading event-density dots in the gutter.
 */
export function buildMonthGrid(monthKey: MonthKey): DayCell[] {
  const { year, month } = parseMonthKey(monthKey);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // 0=Sun..6=Sat → 0=Mon..6=Sun.
  const isoWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < isoWeekday; i++) {
    cells.push({ date: null, day: null, weekday: i });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthKey}-${String(d).padStart(2, "0")}`;
    const weekday = (isoWeekday + (d - 1)) % 7;
    cells.push({ date, day: d, weekday });
  }
  // Pad to a 6-row (42-cell) grid so layout doesn't reflow as months change.
  while (cells.length < 42) {
    cells.push({ date: null, day: null, weekday: cells.length % 7 });
  }
  return cells;
}

/** Bucket a raw event count into a 4-state density level (0/low/med/high). */
export function densityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 6) return 2;
  return 3;
}
