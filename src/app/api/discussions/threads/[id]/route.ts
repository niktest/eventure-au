import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getViewerId,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import { getThreadById } from "@/lib/discussions/queries";
import { hotScore } from "@/lib/discussions/hot-score";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const viewerId = await getViewerId();
  const thread = await getThreadById(id, viewerId);
  if (!thread) return jsonError("Thread not found.", 404);
  return NextResponse.json({ thread });
}

const patchSchema = z.object({
  title: z.string().trim().min(5).max(120).optional(),
  body: z.string().max(5000).optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const existing = await prisma.thread.findUnique({ where: { id } });
  if (!existing) return jsonError("Thread not found.", 404);
  if (existing.authorId !== auth.userId)
    return jsonError("You can only edit your own posts.", 403);
  if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS)
    return jsonError("The 15-minute edit window has passed.", 409);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Check the form and try again.", 400, {
      issues: parsed.error.flatten(),
    });
  }
  const data = parsed.data;
  if (data.title === undefined && data.body === undefined) {
    return jsonError("Nothing to update.", 400);
  }
  await prisma.thread.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.body !== undefined ? { body: data.body.trim() } : {}),
      editedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const existing = await prisma.thread.findUnique({ where: { id } });
  if (!existing) return jsonError("Thread not found.", 404);
  if (existing.authorId !== auth.userId)
    return jsonError("You can only delete your own posts.", 403);
  if (existing.deletedAt) return NextResponse.json({ ok: true });
  const now = new Date();
  await prisma.thread.update({
    where: { id },
    data: {
      deletedAt: now,
      // Drop hot score so deleted threads sink in Hot.
      hotScore: hotScore({
        upvoteCount: 0,
        replyCount: existing.replyCount,
        createdAt: existing.createdAt,
        now,
      }) - 100,
    },
  });
  return NextResponse.json({ ok: true });
}
