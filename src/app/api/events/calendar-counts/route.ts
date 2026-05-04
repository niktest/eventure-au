import { NextResponse } from "next/server";
import { buildCalendarDays } from "@/lib/calendar/buildCalendarDays";

export const revalidate = 600;

export async function GET() {
  const days = await buildCalendarDays({ withCounts: true });
  return NextResponse.json(
    days.map((d) => ({ date: d.date, count: d.eventCount ?? 0 }))
  );
}
