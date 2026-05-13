import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/discussions/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getViewerId();
  if (!userId) {
    return NextResponse.json({ authed: false, ids: [] });
  }
  const rows = await prisma.savedEvent.findMany({
    where: { userId },
    select: { eventId: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ authed: true, ids: rows.map((r) => r.eventId) });
}
