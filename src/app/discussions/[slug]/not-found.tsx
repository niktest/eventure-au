import Link from "next/link";

export default function ThreadNotFound() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
        <span
          className="material-symbols-outlined text-5xl text-secondary"
          aria-hidden="true"
        >
          travel_explore
        </span>
        <h1 className="font-display text-3xl font-extrabold text-on-surface tracking-tight">
          That thread&apos;s gone walkabout.
        </h1>
        <p className="font-body text-base text-secondary">
          It might have been removed, or the link&apos;s wrong.
        </p>
        <Link
          href="/discussions"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_back
          </span>
          Back to Discussions
        </Link>
      </div>
    </div>
  );
}
