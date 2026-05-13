import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import { RL_UPVOTES } from "@/lib/discussions/rate-limit";

// Cap per-request payload so a malicious client can't OOM the server.
const MERGE_LIMIT = 200;

const Body = z.object({
  eventIds: z.array(z.string().min(1).max(64)).max(MERGE_LIMIT),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`saved-event-merge:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload.", 400);
  const ids = Array.from(new Set(parsed.data.eventIds));
  if (ids.length === 0) return NextResponse.json({ ok: true, merged: 0 });

  // Filter to events that actually exist so foreign-key failures don't blow
  // up the whole batch from one stale id sitting in someone's old browser.
  const existing = await prisma.event.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const validIds = existing.map((e) => e.id);
  if (validIds.length === 0) return NextResponse.json({ ok: true, merged: 0 });

  await prisma.savedEvent.createMany({
    data: validIds.map((eventId) => ({ userId: auth.userId, eventId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, merged: validIds.length });
}
