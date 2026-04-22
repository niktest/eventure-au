import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Hub",
  description: "Explore curated collections, join trending conversations, and connect with curators on Eventure.",
};

export default function CommunityPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-16">
        {/* Page Header */}
        <section className="space-y-3">
          <h1 className="font-display text-5xl font-extrabold text-on-background tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Your Community
          </h1>
          <p className="font-body text-lg text-secondary max-w-2xl">
            Dive into curated collections, join trending conversations, and connect with curators who share your vibe.
          </p>
        </section>

        {/* Collections — Coming Soon */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">Curated Collections</h2>
            <Link href="/collections/create" className="font-body text-sm font-semibold text-primary hover:underline">
              Create Collection
            </Link>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container mb-4">
              <span className="material-symbols-outlined text-on-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                collections_bookmark
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-on-surface mb-2">Collections coming soon</h3>
            <p className="font-body text-base text-secondary max-w-md mx-auto">
              We&apos;re building a way for curators to group the best events into shareable collections. Stay tuned!
            </p>
          </div>
        </section>

        {/* Trending Conversations & Curators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Trending Conversations — Coming Soon */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">
                Trending Conversations
              </h2>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-container-low mb-4">
                <span className="material-symbols-outlined text-secondary text-2xl">forum</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-on-surface mb-2">No discussions yet</h3>
              <p className="font-body text-sm text-secondary max-w-sm mx-auto">
                Community discussions are on the way. Soon you&apos;ll be able to chat about upcoming events with fellow event-goers.
              </p>
            </div>
          </section>

          {/* Curators Sidebar — Coming Soon */}
          <aside className="space-y-6">
            <h2 className="font-heading text-2xl font-bold text-on-surface tracking-tight">
              Popular Curators
            </h2>
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high mb-3">
                <span className="material-symbols-outlined text-secondary text-xl">group</span>
              </div>
              <p className="font-body text-sm text-secondary">
                Curator profiles coming soon.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
