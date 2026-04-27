import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getThreadBySlug,
  listRepliesForThread,
} from "@/lib/discussions/queries";
import { categoryLabel } from "@/lib/discussions/categories";
import { timeAgo } from "@/lib/discussions/time-ago";
import { autolink } from "@/lib/discussions/autolink";
import { deriveHandle } from "@/lib/discussions/handle";
import { prisma } from "@/lib/prisma";
import type { ReplySort } from "@/types/discussions";
import { ThreadActions } from "@/components/discussions/ThreadActions";
import { LinkedEventCard } from "@/components/discussions/LinkedEventCard";
import { RepliesSection } from "@/components/discussions/RepliesSection";

export const revalidate = 30;
export const dynamic = "force-dynamic";

const REPLY_SORTS = new Set<ReplySort>(["top", "new"]);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventure.com.au";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug, null);
  if (!thread) return { title: "Thread not found" };
  const description =
    thread.body.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${thread.title} — Gold Coast Discussions on Eventure.`;
  return {
    title: `${thread.title} — Gold Coast Discussions`,
    description,
    openGraph: { title: thread.title, description },
  };
}

export default async function ThreadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rsort?: string }>;
}) {
  const { slug } = await params;
  const { rsort } = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const thread = await getThreadBySlug(slug, viewerId);
  if (!thread) notFound();

  const replySort: ReplySort = REPLY_SORTS.has(rsort as ReplySort)
    ? (rsort as ReplySort)
    : "top";

  const replies = await listRepliesForThread({
    threadId: thread.id,
    sort: replySort,
    viewerId,
  });

  let viewerHandle: string | null = null;
  if (viewerId) {
    const user = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { name: true, email: true },
    });
    if (user) viewerHandle = deriveHandle(user);
  }

  const isDeleted = thread.deletedAt !== null;
  const isHidden = thread.hiddenAt !== null;
  const shareUrl = `${SITE_URL}/discussions/${thread.slug}`;

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    text: thread.body,
    datePublished: thread.createdAt,
    dateModified: thread.updatedAt,
    author: { "@type": "Person", name: `@${thread.author.handle}` },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: thread.upvoteCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: thread.replyCount,
      },
    ],
    url: shareUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <div className="bg-surface-bright min-h-screen">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
          <Link
            href="/discussions"
            className="inline-flex items-center gap-1 font-body text-sm font-semibold text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_back
            </span>
            Back to Discussions
          </Link>

          <header className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-body font-semibold text-secondary uppercase tracking-wide">
              <span className="text-primary">{categoryLabel(thread.category)}</span>
              <span aria-hidden="true">·</span>
              <span>Posted {timeAgo(thread.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>by @{thread.author.handle}</span>
              {thread.editedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span title={new Date(thread.editedAt).toLocaleString("en-AU")}>
                    edited {timeAgo(thread.editedAt)}
                  </span>
                </>
              )}
            </div>
            <h1
              className="font-display text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {thread.title}
            </h1>
          </header>

          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 md:p-6 font-body text-base text-on-surface whitespace-pre-line">
            {isDeleted ? (
              <em className="text-secondary">
                This post was deleted by the author. Replies are preserved below.
              </em>
            ) : isHidden ? (
              <em className="text-secondary">This post is hidden pending review.</em>
            ) : thread.body.trim().length === 0 ? (
              <span className="text-secondary italic">No body — just the title.</span>
            ) : (
              autolink(thread.body)
            )}
          </div>

          {thread.linkedEvent && <LinkedEventCard event={thread.linkedEvent} />}

          <ThreadActions
            thread={thread}
            isSignedIn={Boolean(viewerId)}
            canEdit={thread.isAuthor && !isDeleted}
            shareUrl={shareUrl}
          />

          <hr className="border-outline-variant/40" />

          <RepliesSection
            threadId={thread.id}
            threadSlug={thread.slug}
            isSignedIn={Boolean(viewerId)}
            authorHandle={viewerHandle}
            initialReplies={replies}
            replySort={replySort}
          />
        </div>
      </div>
    </>
  );
}
