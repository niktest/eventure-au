import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyRateLimit,
  getViewerId,
  jsonError,
  requireUser,
} from "@/lib/discussions/api-helpers";
import { listThreads } from "@/lib/discussions/queries";
import { isDiscussionCategory } from "@/lib/discussions/categories";
import { buildThreadSlug } from "@/lib/discussions/slug";
import { hotScore } from "@/lib/discussions/hot-score";
import { RL_THREADS_CREATE } from "@/lib/discussions/rate-limit";

const SORT_VALUES = new Set(["hot", "new", "top"]);

export async function GET(req: NextRequest) {
  const viewerId = await getViewerId();
  const params = req.nextUrl.searchParams;
  const sortRaw = params.get("sort") ?? "hot";
  const sort = (SORT_VALUES.has(sortRaw) ? sortRaw : "hot") as
    | "hot"
    | "new"
    | "top";
  const categoryRaw = params.get("category");
  const category =
    categoryRaw && isDiscussionCategory(categoryRaw) ? categoryRaw : undefined;
  const query = params.get("q") ?? undefined;
  const hasEvent = params.get("hasEvent") === "1";
  const mine = params.get("mine") === "1";
  const cursor = params.get("cursor") ?? undefined;
  const eventId = params.get("eventId") ?? undefined;

  try {
    const result = await listThreads({
      sort,
      category,
      query,
      hasEvent,
      mineUserId: mine && viewerId ? viewerId : undefined,
      cursor,
      eventId,
      viewerId,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[threads:list]", err);
    return jsonError("Couldn't load discussions.", 500);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(5).max(120),
  body: z.string().max(5000).optional().default(""),
  category: z.string().refine(isDiscussionCategory, {
    message: "Unknown category.",
  }),
  linkedEventSlug: z.string().trim().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const limited = applyRateLimit(`thread-create:${auth.userId}`, RL_THREADS_CREATE);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the form and try again.", 400, {
      issues: parsed.error.flatten(),
    });
  }
  const data = parsed.data;

  let linkedEventId: string | null = null;
  if (data.linkedEventSlug) {
    const event = await prisma.event.findUnique({
      where: { slug: data.linkedEventSlug },
      select: { id: true },
    });
    if (!event) {
      return jsonError("Linked event not found.", 400);
    }
    linkedEventId = event.id;
  }

  const slug = buildThreadSlug(data.title);
  const now = new Date();
  const initialUpvoteCount = 1; // implicit author self-upvote per CEO guidance
  const initialReplyCount = 0;
  const score = hotScore({
    upvoteCount: initialUpvoteCount,
    replyCount: initialReplyCount,
    createdAt: now,
    now,
  });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const thread = await tx.thread.create({
        data: {
          slug,
          title: data.title.trim(),
          body: (data.body ?? "").trim(),
          category: data.category,
          authorId: auth.userId,
          linkedEventId,
          upvoteCount: initialUpvoteCount,
          replyCount: initialReplyCount,
          hotScore: score,
        },
      });
      await tx.threadUpvote.create({
        data: { threadId: thread.id, userId: auth.userId },
      });
      return thread;
    });
    return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 });
  } catch (err) {
    console.error("[thread:create]", err);
    return jsonError("Couldn't post your thread. Try again — your text is safe.", 500);
  }
}
