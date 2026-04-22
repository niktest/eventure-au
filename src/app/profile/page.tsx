import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "View your profile, saved events, collections, and activity on Eventure Discovery.",
};

const SAVED_EVENTS = [
  {
    slug: "sunset-sounds-burleigh",
    title: "Sunset Sounds at Burleigh",
    location: "Burleigh Head National Park",
    date: "Sat, 2 May 2026",
    category: "Live Music",
  },
  {
    slug: "gold-coast-night-markets",
    title: "Gold Coast Night Markets",
    location: "Surfers Paradise Foreshore",
    date: "Fri, 8 May 2026",
    category: "Markets",
  },
  {
    slug: "hota-gallery-opening",
    title: "HOTA Gallery Opening Night",
    location: "HOTA, Home of the Arts",
    date: "Thu, 14 May 2026",
    category: "Arts & Culture",
  },
];

const TABS = ["Saved Events", "My Collections", "Activity"] as const;

export default function ProfilePage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-12 space-y-12">
        {/* Profile Header */}
        <section className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-surface-dim shrink-0" />

          {/* Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <h1
              className="font-display text-4xl font-extrabold text-on-surface tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Alex Rivera
            </h1>

            <div className="flex items-center justify-center md:justify-start gap-1 text-secondary">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
              <span className="font-body text-sm">Gold Coast, QLD</span>
            </div>

            <p className="font-body text-sm text-secondary">
              Member since January 2025
            </p>

            <div className="pt-1">
              <button className="border-2 border-secondary text-secondary font-body text-sm font-semibold px-5 py-2 rounded-full hover:bg-surface-container-low transition-colors">
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-3 gap-4 max-w-lg mx-auto md:mx-0">
          {[
            { value: "12", label: "Events Attended" },
            { value: "5", label: "Collections" },
            { value: "24", label: "Following" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-low rounded-xl p-4 text-center border border-outline-variant/30"
            >
              <p className="font-heading text-2xl font-bold text-on-surface">
                {stat.value}
              </p>
              <p className="font-body text-xs text-secondary mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <section className="space-y-8">
          <div className="flex gap-6 border-b border-surface-container-high">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                className={`font-body text-sm font-semibold pb-3 transition-colors ${
                  i === 0
                    ? "text-primary border-b-2 border-primary"
                    : "text-secondary hover:text-on-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Saved Events Content */}
          <div>
            <h2 className="font-heading text-2xl font-bold text-on-surface tracking-tight mb-6">
              Saved Events
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SAVED_EVENTS.map((event) => (
                <Link
                  key={event.slug}
                  href={`/events/${event.slug}`}
                  className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                >
                  {/* Image Placeholder */}
                  <div className="aspect-video bg-surface-dim" />

                  {/* Card Body */}
                  <div className="p-4 space-y-2">
                    <span className="font-body text-xs font-semibold text-primary">
                      {event.category}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-on-surface">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span className="font-body text-sm">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      <span className="font-body text-sm">{event.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
