import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/discussions/api-helpers";
import { EVENT_CARD_SELECT } from "@/lib/events/eventCardSelect";

export const dynamic = "force-dynamic";

const MAX_IDS = 200;

export async function GET(req: NextRequest) {
  const userId = await getViewerId();
  if (userId) {
    const rows = await prisma.savedEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { event: { select: EVENT_CARD_SELECT } },
    });
    return NextResponse.json({
      authed: true,
      events: rows.map((r) => r.event),
    });
  }
  // Anonymous: client passes the IDs it has in localStorage.
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_IDS);
  if (ids.length === 0) {
    return NextResponse.json({ authed: false, events: [] });
  }
  const events = await prisma.event.findMany({
    where: { id: { in: ids }, status: "published" },
    select: EVENT_CARD_SELECT,
  });
  // Preserve client-order (most-recent first) instead of DB scan order.
  const order = new Map(ids.map((id, i) => [id, i]));
  events.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return NextResponse.json({ authed: false, events });
}
