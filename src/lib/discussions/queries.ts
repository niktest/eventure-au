import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveHandle } from "./handle";
import type {
  ThreadSummary,
  ThreadDetail,
  ReplySummary,
  TrendingEvent,
  ThreadSort,
  ReplySort,
} from "@/types/discussions";
import type { DiscussionCategory } from "./categories";

const THREAD_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  linkedEvent: {
    select: {
      id: true,
      slug: true,
      name: true,
      startDate: true,
      endDate: true,
      city: true,
      imageUrl: true,
      venueName: true,
    },
  },
} satisfies Prisma.ThreadInclude;

const REPLY_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ReplyInclude;

type ThreadRow = Prisma.ThreadGetPayload<{ include: typeof THREAD_INCLUDE }>;
type ReplyRow = Prisma.ReplyGetPayload<{ include: typeof REPLY_INCLUDE }>;

const EXCERPT_LIMIT = 180;

function makeExcerpt(body: string): string {
  const stripped = body.replace(/\s+/g, " ").trim();
  if (stripped.length <= EXCERPT_LIMIT) return stripped;
  return stripped.slice(0, EXCERPT_LIMIT - 1).trimEnd() + "…";
}

function thread(row: ThreadRow, upvotedByMe: boolean): ThreadSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: makeExcerpt(row.body),
    category: row.category,
    city: row.cityId,
    author: {
      id: row.author.id,
      handle: deriveHandle(row.author),
      name: row.author.name,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    upvoteCount: row.upvoteCount,
    replyCount: row.replyCount,
    upvotedByMe,
    linkedEvent: row.linkedEvent
      ? {
          id: row.linkedEvent.id,
          slug: row.linkedEvent.slug,
          name: row.linkedEvent.name,
          startDate: row.linkedEvent.startDate.toISOString(),
          endDate: row.linkedEvent.endDate?.toISOString() ?? null,
          city: row.linkedEvent.city,
          imageUrl: row.linkedEvent.imageUrl,
          venueName: row.linkedEvent.venueName,
        }
      : null,
  };
}

function detail(
  row: ThreadRow,
  upvotedByMe: boolean,
  viewerId: string | null
): ThreadDetail {
  return {
    ...thread(row, upvotedByMe),
    body: row.body,
    isAuthor: viewerId !== null && viewerId === row.authorId,
  };
}

function reply(
  row: ReplyRow,
  upvotedByMe: boolean,
  viewerId: string | null
): ReplySummary {
  return {
    id: row.id,
    threadId: row.threadId,
    body: row.body,
    author: {
      id: row.author.id,
      handle: deriveHandle(row.author),
      name: row.author.name,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    upvoteCount: row.upvoteCount,
    upvotedByMe,
    isAuthor: viewerId !== null && viewerId === row.authorId,
  };
}

export interface ListThreadsArgs {
  sort: ThreadSort;
  category?: DiscussionCategory;
  query?: string;
  hasEvent?: boolean;
  mineUserId?: string;
  cursor?: string;
  take?: number;
  cityId?: string;
  viewerId?: string | null;
  eventId?: string;
}

const DEFAULT_TAKE = 20;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function listThreads(
  args: ListThreadsArgs
): Promise<{ threads: ThreadSummary[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(args.take ?? DEFAULT_TAKE, 1), 50);
  const where: Prisma.ThreadWhereInput = {
    cityId: args.cityId ?? "gold-coast",
    hiddenAt: null,
  };
  if (args.category) where.category = args.category;
  if (args.hasEvent) where.linkedEventId = { not: null };
  if (args.mineUserId) where.authorId = args.mineUserId;
  if (args.eventId) where.linkedEventId = args.eventId;
  if (args.query && args.query.trim().length > 0) {
    const q = args.query.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }
  if (args.sort === "top") {
    where.createdAt = { gte: new Date(Date.now() - SEVEN_DAYS_MS) };
  }

  const orderBy: Prisma.ThreadOrderByWithRelationInput[] =
    args.sort === "new"
      ? [{ createdAt: "desc" }, { id: "desc" }]
      : args.sort === "top"
        ? [{ upvoteCount: "desc" }, { createdAt: "desc" }, { id: "desc" }]
        : [{ hotScore: "desc" }, { createdAt: "desc" }, { id: "desc" }];

  const rows = await prisma.thread.findMany({
    where,
    orderBy,
    take: take + 1,
    skip: args.cursor ? 1 : 0,
    cursor: args.cursor ? { id: args.cursor } : undefined,
    include: THREAD_INCLUDE,
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? slice[slice.length - 1].id : null;

  const upvoteSet = await loadThreadUpvoteSet(
    args.viewerId ?? null,
    slice.map((r) => r.id)
  );

  return {
    threads: slice.map((r) => thread(r, upvoteSet.has(r.id))),
    nextCursor,
  };
}

async function loadThreadUpvoteSet(
  viewerId: string | null,
  threadIds: string[]
): Promise<Set<string>> {
  if (!viewerId || threadIds.length === 0) return new Set();
  const rows = await prisma.threadUpvote.findMany({
    where: { userId: viewerId, threadId: { in: threadIds } },
    select: { threadId: true },
  });
  return new Set(rows.map((r) => r.threadId));
}

async function loadReplyUpvoteSet(
  viewerId: string | null,
  replyIds: string[]
): Promise<Set<string>> {
  if (!viewerId || replyIds.length === 0) return new Set();
  const rows = await prisma.replyUpvote.findMany({
    where: { userId: viewerId, replyId: { in: replyIds } },
    select: { replyId: true },
  });
  return new Set(rows.map((r) => r.replyId));
}

export async function getThreadBySlug(
  slug: string,
  viewerId: string | null
): Promise<ThreadDetail | null> {
  const row = await prisma.thread.findUnique({
    where: { slug },
    include: THREAD_INCLUDE,
  });
  if (!row) return null;
  const upvotes = await loadThreadUpvoteSet(viewerId, [row.id]);
  return detail(row, upvotes.has(row.id), viewerId);
}

export async function getThreadById(
  id: string,
  viewerId: string | null
): Promise<ThreadDetail | null> {
  const row = await prisma.thread.findUnique({
    where: { id },
    include: THREAD_INCLUDE,
  });
  if (!row) return null;
  const upvotes = await loadThreadUpvoteSet(viewerId, [row.id]);
  return detail(row, upvotes.has(row.id), viewerId);
}

export async function listRepliesForThread(args: {
  threadId: string;
  sort: ReplySort;
  viewerId: string | null;
}): Promise<ReplySummary[]> {
  const orderBy: Prisma.ReplyOrderByWithRelationInput[] =
    args.sort === "new"
      ? [{ createdAt: "asc" }]
      : [{ upvoteCount: "desc" }, { createdAt: "asc" }];
  const rows = await prisma.reply.findMany({
    where: { threadId: args.threadId, hiddenAt: null },
    orderBy,
    include: REPLY_INCLUDE,
  });
  const upvotes = await loadReplyUpvoteSet(
    args.viewerId,
    rows.map((r) => r.id)
  );
  return rows.map((r) => reply(r, upvotes.has(r.id), args.viewerId));
}

export async function getTrendingEvents(args: {
  cityId?: string;
  limit?: number;
}): Promise<TrendingEvent[]> {
  const limit = args.limit ?? 5;
  const rows = await prisma.thread.groupBy({
    by: ["linkedEventId"],
    where: {
      cityId: args.cityId ?? "gold-coast",
      linkedEventId: { not: null },
      hiddenAt: null,
      createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
    },
    _count: { _all: true },
    orderBy: { _count: { linkedEventId: "desc" } },
    take: limit,
  });
  const eventIds = rows
    .map((r) => r.linkedEventId)
    .filter((id): id is string => id !== null);
  if (eventIds.length === 0) return [];
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, slug: true, name: true },
  });
  const byId = new Map(events.map((e) => [e.id, e]));
  return rows
    .map((r) => {
      const e = r.linkedEventId ? byId.get(r.linkedEventId) : null;
      if (!e) return null;
      return { slug: e.slug, name: e.name, threadCount: r._count._all };
    })
    .filter((e): e is TrendingEvent => e !== null);
}

export async function getReplyById(
  id: string,
  viewerId: string | null
): Promise<ReplySummary | null> {
  const row = await prisma.reply.findUnique({
    where: { id },
    include: REPLY_INCLUDE,
  });
  if (!row) return null;
  const upvotes = await loadReplyUpvoteSet(viewerId, [row.id]);
  return reply(row, upvotes.has(row.id), viewerId);
}

export async function listLatestThreadsForEvent(args: {
  eventId: string;
  limit?: number;
  viewerId?: string | null;
}): Promise<ThreadSummary[]> {
  const rows = await prisma.thread.findMany({
    where: { linkedEventId: args.eventId, hiddenAt: null, deletedAt: null },
    orderBy: [{ createdAt: "desc" }],
    take: args.limit ?? 3,
    include: THREAD_INCLUDE,
  });
  const upvotes = await loadThreadUpvoteSet(
    args.viewerId ?? null,
    rows.map((r) => r.id)
  );
  return rows.map((r) => thread(r, upvotes.has(r.id)));
}
