import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Collections",
  description: "Browse curated event collections on Eventure Discovery — handpicked events grouped by the community.",
};

export default function CollectionsPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-12">
        {/* Page Header */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/community"
              className="inline-flex items-center gap-1 font-body text-sm text-secondary hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Community
            </Link>
          </div>
          <h1 className="font-display text-5xl font-extrabold text-on-background tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Collections
          </h1>
          <p className="font-body text-lg text-secondary max-w-2xl">
            Curated event collections created by the community — discover handpicked events grouped around themes, seasons, and vibes.
          </p>
        </section>

        {/* Empty State */}
        <section className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-16 text-center">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-container mb-6">
              <span className="material-symbols-outlined text-on-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                collections_bookmark
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-on-surface mb-3">
              Collections coming soon
            </h2>
            <p className="font-body text-base text-secondary max-w-md mb-8">
              We&apos;re building a way for curators to group the best events into shareable collections. Be the first to create one!
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/collections/create"
                className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create Collection
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-surface-container-low text-on-surface font-body text-sm font-semibold px-6 py-3 rounded-full hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">explore</span>
                Browse Events
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
