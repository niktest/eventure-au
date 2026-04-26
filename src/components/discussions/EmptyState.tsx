import Link from "next/link";

interface EmptyStateProps {
  isSignedIn: boolean;
  context: "zero-city" | "filter" | "search";
  query?: string;
  clearHref?: string;
}

export function EmptyState({
  isSignedIn,
  context,
  query,
  clearHref = "/discussions",
}: EmptyStateProps) {
  if (context === "zero-city") {
    return (
      <div className="flex flex-col items-center text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-container-low mb-6">
          <span
            className="material-symbols-outlined text-secondary text-4xl"
            aria-hidden="true"
          >
            forum
          </span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-on-surface mb-3">
          Be the first to start a conversation.
        </h2>
        <p className="font-body text-base text-secondary max-w-md mb-6">
          Got a hot take on a gig, a market find, or a Friday-night question?
          Drop it in — your future Gold Coast crew is listening.
        </p>
        <Link
          href={
            isSignedIn
              ? "/discussions/new"
              : "/login?next=%2Fdiscussions%2Fnew"
          }
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {isSignedIn ? "Start the first thread" : "Sign in & start a thread"}
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-8 text-center">
      <h3 className="font-heading text-lg font-bold text-on-surface mb-2">
        {context === "search" ? `No threads about “${query}” yet.` : "Nothing here yet."}
      </h3>
      <p className="font-body text-sm text-secondary max-w-md mx-auto mb-4">
        {context === "search"
          ? "Be the first — or check the spelling and try again."
          : "No threads match these filters. Try clearing them, or be the first to post in this category."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href={clearHref}
          className="inline-flex items-center text-sm font-body font-semibold text-secondary hover:text-on-surface px-4 py-2 rounded-full hover:bg-surface-container-low transition-colors"
        >
          {context === "search" ? "Clear search" : "Clear filters"}
        </Link>
        <Link
          href={
            isSignedIn
              ? "/discussions/new"
              : "/login?next=%2Fdiscussions%2Fnew"
          }
          className="inline-flex items-center gap-2 bg-primary text-on-primary text-sm font-body font-semibold px-5 py-2 rounded-full hover:shadow-md transition-all"
        >
          Start a thread
        </Link>
      </div>
    </div>
  );
}
