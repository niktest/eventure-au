import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  getViewerId,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import {
  getReplyById,
  listRepliesForThread,
} from "@/lib/discussions/queries";
import { hotScore } from "@/lib/discussions/hot-score";
import { RL_REPLIES_CREATE } from "@/lib/discussions/rate-limit";

const REPLY_SORTS = new Set(["top", "new"]);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const viewerId = await getViewerId();
  const sortRaw = req.nextUrl.searchParams.get("sort") ?? "top";
  const sort = (REPLY_SORTS.has(sortRaw) ? sortRaw : "top") as "top" | "new";
  try {
    const replies = await listRepliesForThread({ threadId: id, sort, viewerId });
    return NextResponse.json({ replies });
  } catch (err) {
    console.error("[replies:list]", err);
    return jsonError("Couldn't load replies.", 500);
  }
}

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`reply-create:${auth.userId}`, RL_REPLIES_CREATE);
  if (limited) return limited;

  const { id } = await ctx.params;
  const thread = await prisma.thread.findUnique({
    where: { id },
    select: {
      id: true,
      deletedAt: true,
      hiddenAt: true,
      upvoteCount: true,
      createdAt: true,
    },
  });
  if (!thread) return jsonError("Thread not found.", 404);
  if (thread.deletedAt || thread.hiddenAt)
    return jsonError("This thread is closed for replies.", 409);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Reply can't be empty.", 400, { issues: parsed.error.flatten() });
  }
  const body = parsed.data.body.trim();

  try {
    const reply = await prisma.$transaction(async (tx) => {
      const created = await tx.reply.create({
        data: { threadId: id, authorId: auth.userId, body },
      });
      const updated = await tx.thread.update({
        where: { id },
        data: { replyCount: { increment: 1 } },
        select: { replyCount: true, upvoteCount: true, createdAt: true },
      });
      await tx.thread.update({
        where: { id },
        data: {
          hotScore: hotScore({
            upvoteCount: updated.upvoteCount,
            replyCount: updated.replyCount,
            createdAt: updated.createdAt,
          }),
        },
      });
      return created;
    });
    const summary = await getReplyById(reply.id, auth.userId);
    return NextResponse.json(
      { id: reply.id, reply: summary },
      { status: 201 }
    );
  } catch (err) {
    console.error("[reply:create]", err);
    return jsonError(
      "Couldn't post your reply. Check your connection and try again.",
      500
    );
  }
}
