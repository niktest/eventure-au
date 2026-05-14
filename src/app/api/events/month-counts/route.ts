import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMonths, parseMonthKey } from "@/lib/calendar/monthRing";

export const revalidate = 600;

function isMonthKey(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * GET /api/events/month-counts?from=YYYY-MM&to=YYYY-MM
 *
 * Returns per-date event counts as a map `{ "YYYY-MM-DD": count }`. The window
 * is half-open `[from-01, (to+1)-01)` in UTC. The calendar uses this to draw
 * density dots on day cells. Capped at 13 months (ring-window-friendly) so a
 * runaway client can't ask for years of dot data.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? from;

  if (!isMonthKey(from) || !isMonthKey(to)) {
    return NextResponse.json(
      { error: "from and to must be YYYY-MM" },
      { status: 400 }
    );
  }

  const fromParts = parseMonthKey(from);
  const toParts = parseMonthKey(to);
  const span =
    toParts.year * 12 + (toParts.month - 1) - (fromParts.year * 12 + (fromParts.month - 1));
  if (span < 0 || span > 12) {
    return NextResponse.json(
      { error: "to must be >= from and span must be <= 13 months" },
      { status: 400 }
    );
  }

  const rangeStart = new Date(Date.UTC(fromParts.year, fromParts.month - 1, 1));
  const afterTo = parseMonthKey(addMonths(to, 1));
  const rangeEnd = new Date(Date.UTC(afterTo.year, afterTo.month - 1, 1));

  const counts: Record<string, number> = {};
  try {
    const events = await prisma.event.findMany({
      where: {
        status: "published",
        startDate: { gte: rangeStart, lt: rangeEnd },
      },
      select: { startDate: true },
    });
    for (const e of events) {
      const key = isoDate(e.startDate);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  } catch {
    // DB unavailable — return an empty map; the calendar still renders dates.
  }

  return NextResponse.json({ from, to, counts });
}
