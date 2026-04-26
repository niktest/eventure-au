import Link from "next/link";
import type { ThreadSummary } from "@/types/discussions";
import { categoryLabel } from "@/lib/discussions/categories";
import { timeAgo } from "@/lib/discussions/time-ago";

export function ThreadCard({ thread }: { thread: ThreadSummary }) {
  const isDeleted = thread.deletedAt !== null;
  return (
    <article
      className="group bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 hover:bg-surface-container-low transition-colors focus-within:ring-2 focus-within:ring-primary"
    >
      <div className="flex items-center gap-2 text-xs font-body font-semibold text-secondary uppercase tracking-wide mb-2">
        <span className="text-primary">{categoryLabel(thread.category)}</span>
        <span aria-hidden="true">·</span>
        <span>{timeAgo(thread.createdAt)}</span>
        <span aria-hidden="true">·</span>
        <span>@{thread.author.handle}</span>
      </div>
      <h2 className="font-heading text-lg md:text-xl font-bold text-on-surface mb-2 leading-snug">
        <Link
          href={`/discussions/${thread.slug}`}
          className="focus-visible:outline-none after:absolute after:inset-0 relative"
        >
          {isDeleted ? <em className="text-secondary">[deleted]</em> : thread.title}
        </Link>
      </h2>
      {!isDeleted && thread.excerpt.length > 0 && (
        <p className="font-body text-sm text-on-surface-variant line-clamp-2 mb-3">
          {thread.excerpt}
        </p>
      )}
      {thread.linkedEvent && (
        <div className="inline-flex items-center gap-2 bg-surface-container text-on-surface text-xs font-body font-semibold px-3 py-1.5 rounded-full mb-3">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            event
          </span>
          <span>{thread.linkedEvent.name}</span>
        </div>
      )}
      <div className="flex items-center gap-5 text-sm font-body font-semibold text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`material-symbols-outlined text-[18px] ${thread.upvoteCount > 0 ? "text-primary" : ""}`}
            aria-hidden="true"
          >
            arrow_upward
          </span>
          <span>{thread.upvoteCount}</span>
          <span className="sr-only"> upvotes</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            chat_bubble_outline
          </span>
          <span>{thread.replyCount}</span>
          <span className="sr-only"> replies</span>
        </span>
      </div>
    </article>
  );
}

export function ThreadCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 animate-pulse">
      <div className="h-3 w-1/3 bg-surface-container-low rounded mb-3" />
      <div className="h-5 w-2/3 bg-surface-container-low rounded mb-3" />
      <div className="h-4 w-full bg-surface-container-low rounded mb-2" />
      <div className="h-4 w-5/6 bg-surface-container-low rounded mb-4" />
      <div className="flex gap-4">
        <div className="h-4 w-12 bg-surface-container-low rounded" />
        <div className="h-4 w-12 bg-surface-container-low rounded" />
      </div>
    </div>
  );
}
