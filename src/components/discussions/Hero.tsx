import Link from "next/link";

interface DiscussionsHeroProps {
  city: string;
  threadCount: number;
  isSignedIn: boolean;
  newThreadHref?: string;
}

export function DiscussionsHero({
  city,
  threadCount,
  isSignedIn,
  newThreadHref = "/discussions/new",
}: DiscussionsHeroProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
            <h1
              className="font-display text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Discussions <span aria-hidden="true">🔥</span>
            </h1>
          </div>
          <p className="font-body text-base md:text-lg text-secondary max-w-2xl">
            {city} — what the community&apos;s talking about right now.
            {threadCount > 0 ? (
              <span className="text-on-surface-variant">
                {" "}
                {threadCount.toLocaleString()} thread
                {threadCount === 1 ? "" : "s"} so far.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-stretch md:items-end gap-1">
          <Link
            href={
              isSignedIn ? newThreadHref : `/login?next=${encodeURIComponent(newThreadHref)}`
            }
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            Start a thread
          </Link>
          {!isSignedIn && (
            <span className="font-body text-xs text-secondary md:text-right">
              Sign in to post — reading is open to everyone.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
