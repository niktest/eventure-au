import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import { hotScore } from "@/lib/discussions/hot-score";
import { RL_UPVOTES } from "@/lib/discussions/rate-limit";

async function recomputeHot(threadId: string) {
  const t = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { upvoteCount: true, replyCount: true, createdAt: true },
  });
  if (!t) return;
  await prisma.thread.update({
    where: { id: threadId },
    data: { hotScore: hotScore(t) },
  });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`thread-upvote:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;
  const { id } = await ctx.params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.threadUpvote.create({
        data: { threadId: id, userId: auth.userId },
      });
      await tx.thread.update({
        where: { id },
        data: { upvoteCount: { increment: 1 } },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Already upvoted — idempotent success.
      return NextResponse.json({ ok: true });
    }
    console.error("[thread:upvote]", err);
    return jsonError("Upvote didn't save, try again.", 500);
  }
  await recomputeHot(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`thread-upvote:${auth.userId}`, RL_UPVOTES);
  if (limited) return limited;
  const { id } = await ctx.params;
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.threadUpvote.findUnique({
        where: { threadId_userId: { threadId: id, userId: auth.userId } },
      });
      if (!existing) return;
      await tx.threadUpvote.delete({
        where: { threadId_userId: { threadId: id, userId: auth.userId } },
      });
      await tx.thread.update({
        where: { id },
        data: { upvoteCount: { decrement: 1 } },
      });
    });
  } catch (err) {
    console.error("[thread:unvote]", err);
    return jsonError("Couldn't remove upvote.", 500);
  }
  await recomputeHot(id);
  return NextResponse.json({ ok: true });
}
