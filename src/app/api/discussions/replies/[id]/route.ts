import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/discussions/api-helpers";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

const patchSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const existing = await prisma.reply.findUnique({ where: { id } });
  if (!existing) return jsonError("Reply not found.", 404);
  if (existing.authorId !== auth.userId)
    return jsonError("You can only edit your own replies.", 403);
  if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS)
    return jsonError("The 15-minute edit window has passed.", 409);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success)
    return jsonError("Reply can't be empty.", 400, {
      issues: parsed.error.flatten(),
    });

  await prisma.reply.update({
    where: { id },
    data: { body: parsed.data.body.trim(), editedAt: new Date() },
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
  const existing = await prisma.reply.findUnique({ where: { id } });
  if (!existing) return jsonError("Reply not found.", 404);
  if (existing.authorId !== auth.userId)
    return jsonError("You can only delete your own replies.", 403);
  if (existing.deletedAt) return NextResponse.json({ ok: true });
  await prisma.reply.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
