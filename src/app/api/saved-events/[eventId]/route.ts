import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import { RL_UPVOTES } from "@/lib/discussions/rate-limit";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`saved-event:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;
  const { eventId } = await ctx.params;
  try {
    await prisma.savedEvent.create({
      data: { userId: auth.userId, eventId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Already saved — idempotent success.
      return NextResponse.json({ ok: true });
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return jsonError("Event not found.", 404);
    }
    console.error("[saved-event:create]", err);
    return jsonError("Couldn't save event, try again.", 500);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`saved-event:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;
  const { eventId } = await ctx.params;
  try {
    await prisma.savedEvent.deleteMany({
      where: { userId: auth.userId, eventId },
    });
  } catch (err) {
    console.error("[saved-event:delete]", err);
    return jsonError("Couldn't unsave event.", 500);
  }
  return NextResponse.json({ ok: true });
}
