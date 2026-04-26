import Link from "next/link";
import type { ThreadSummary } from "@/types/discussions";
import { categoryLabel } from "@/lib/discussions/categories";
import { timeAgo } from "@/lib/discussions/time-ago";

interface EventDiscussPanelProps {
  eventSlug: string;
  eventName: string;
  threads: ThreadSummary[];
  isSignedIn: boolean;
}

export function EventDiscussPanel({
  eventSlug,
  eventName,
  threads,
  isSignedIn,
}: EventDiscussPanelProps) {
  const newHref = `/discussions/new?eventSlug=${encodeURIComponent(eventSlug)}`;
  const linkPrefix = isSignedIn ? newHref : `/login?next=${encodeURIComponent(newHref)}`;
  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-2xl"
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            forum
          </span>
          <h2 className="font-heading text-xl font-bold text-on-surface">
            Discuss this event
          </h2>
        </div>
        <Link
          href={`/discussions?eventSlug=${encodeURIComponent(eventSlug)}`}
          className="font-body text-sm font-semibold text-primary hover:underline"
        >
          See all discussions
        </Link>
      </div>
      {threads.length === 0 ? (
        <div className="text-center py-4 space-y-3">
          <p className="font-body text-sm text-secondary">
            Be the first to start a discussion about{" "}
            <span className="font-semibold text-on-surface">{eventName}</span>.
          </p>
          <Link
            href={linkPrefix}
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-5 py-2 rounded-full hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            Start a thread
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Link
                  href={`/discussions/${thread.slug}`}
                  className="block bg-surface-container-low hover:bg-surface-container rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-body font-semibold text-secondary uppercase tracking-wide mb-1">
                    <span className="text-primary">
                      {categoryLabel(thread.category)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(thread.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span>@{thread.author.handle}</span>
                  </div>
                  <div className="font-body text-sm font-semibold text-on-surface line-clamp-2">
                    {thread.title}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-body text-secondary mt-1">
                    <span>▲ {thread.upvoteCount}</span>
                    <span>💬 {thread.replyCount}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={linkPrefix}
            className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            Add a thread
          </Link>
        </>
      )}
    </section>
  );
}
