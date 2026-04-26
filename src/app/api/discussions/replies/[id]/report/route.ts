import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import { RL_REPORTS } from "@/lib/discussions/rate-limit";
import { notifyModerationTeam } from "@/lib/discussions/mod-email";
import { deriveHandle } from "@/lib/discussions/handle";

const REASONS = ["spam", "harassment", "off_topic", "other"] as const;

const schema = z.object({
  reason: z.enum(REASONS),
  detail: z.string().trim().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`reply-report:${auth.userId}`, RL_REPORTS);
  if (limited) return limited;

  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Pick a reason to submit a report.", 400);
  }
  if (parsed.data.reason === "other" && !parsed.data.detail) {
    return jsonError("Tell us a bit more so we can review.", 400);
  }

  const reply = await prisma.reply.findUnique({
    where: { id },
    select: { id: true, thread: { select: { slug: true } } },
  });
  if (!reply) return jsonError("Reply not found.", 404);

  try {
    await prisma.replyReport.create({
      data: {
        replyId: id,
        reporterId: auth.userId,
        reason: parsed.data.reason,
        detail: parsed.data.detail ?? null,
      },
    });
    const reporter = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true },
    });
    notifyModerationTeam({
      kind: "reply",
      targetId: id,
      reporterHandle: deriveHandle({
        name: reporter?.name,
        email: reporter?.email,
      }),
      reason: parsed.data.reason,
      detail: parsed.data.detail ?? null,
      url: `/discussions/${reply.thread.slug}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return jsonError("You've already reported this.", 409);
    }
    console.error("[reply:report]", err);
    return jsonError("Couldn't submit report. Try again.", 500);
  }
}
