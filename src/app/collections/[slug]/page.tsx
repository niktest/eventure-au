import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Collection",
  description: "Explore a curated collection of events on Eventure Discovery.",
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;

  return (
    <div className="bg-surface-bright min-h-screen">
      {/* Minimal Hero */}
      <div className="relative h-[200px] bg-inverse-surface overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/community"
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-on-surface shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Community
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
          <div className="max-w-[1280px] mx-auto">
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Collection
            </h1>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-container-low mb-6">
            <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              collections_bookmark
            </span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-on-surface mb-3">
            Collections coming soon
          </h2>
          <p className="font-body text-base text-secondary max-w-md mb-8">
            Curated event collections aren&apos;t available yet. Soon you&apos;ll be able to browse and follow collections created by the community.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/community"
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              Community Hub
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
      </div>
    </div>
  );
}
