import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "View your profile, saved events, collections, and activity on Eventure Discovery.",
};

export default function ProfilePage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        {/* Empty State */}
        <div className="flex flex-col items-center text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-container-low mb-6">
            <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              person
            </span>
          </div>
          <h1
            className="font-display text-4xl font-extrabold text-on-surface tracking-tight mb-3"
            style={{ letterSpacing: "-0.02em" }}
          >
            Your Profile
          </h1>
          <p className="font-body text-base text-secondary max-w-md mb-3">
            User profiles are coming soon. You&apos;ll be able to save events, create collections, and track your activity across Eventure.
          </p>
          <p className="font-body text-sm text-secondary/70 mb-8">
            Stay tuned — we&apos;re working on it!
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
}
