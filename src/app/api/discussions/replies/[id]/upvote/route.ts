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
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`reply-upvote:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;
  const { id } = await ctx.params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.replyUpvote.create({
        data: { replyId: id, userId: auth.userId },
      });
      await tx.reply.update({
        where: { id },
        data: { upvoteCount: { increment: 1 } },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    )
      return NextResponse.json({ ok: true });
    console.error("[reply:upvote]", err);
    return jsonError("Upvote didn't save, try again.", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`reply-upvote:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;
  const { id } = await ctx.params;
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.replyUpvote.findUnique({
        where: { replyId_userId: { replyId: id, userId: auth.userId } },
      });
      if (!existing) return;
      await tx.replyUpvote.delete({
        where: { replyId_userId: { replyId: id, userId: auth.userId } },
      });
      await tx.reply.update({
        where: { id },
        data: { upvoteCount: { decrement: 1 } },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reply:unvote]", err);
    return jsonError("Couldn't remove upvote.", 500);
  }
}
