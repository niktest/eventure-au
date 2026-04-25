import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trending Discussions",
  description: "Join the conversation — explore trending discussions about events, festivals, music, and more on Eventure Discovery.",
};

export default function TrendingDiscussionsPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-10">
        {/* Page Header */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <h1
              className="font-display text-5xl font-extrabold text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Trending Discussions 🔥
            </h1>
          </div>
          <p className="font-body text-lg text-secondary max-w-2xl">
            See what the community is buzzing about 💬 — jump into conversations, share your takes, and connect with fellow event-goers. 🎉
          </p>
        </section>

        {/* Empty State */}
        <section className="flex flex-col items-center text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-container-low mb-6">
            <span className="material-symbols-outlined text-secondary text-4xl">forum</span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-on-surface mb-3">
            Discussions coming soon ✨
          </h2>
          <p className="font-body text-base text-secondary max-w-md mb-8">
            We&apos;re building a space where you can chat about upcoming events, share tips, and connect with the local community. Check back soon! 👋
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            Browse Events
          </Link>
        </section>
      </div>
    </div>
  );
}
