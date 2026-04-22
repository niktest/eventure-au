import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Collection",
  description: "Explore a curated collection of events on Eventure Discovery.",
};

const MOCK_EVENTS = [
  {
    id: "1",
    title: "Sunset Sessions Vol. 12",
    location: "Surfers Paradise Beach",
    date: "May 3",
    image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80",
  },
  {
    id: "2",
    title: "Deep House Rooftop",
    location: "SkyPoint Observation Deck",
    date: "May 10",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",
  },
  {
    id: "3",
    title: "Bass Coast Afterparty",
    location: "Miami Marketta, Gold Coast",
    date: "May 17",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80",
  },
  {
    id: "4",
    title: "Acoustic Sundays",
    location: "Burleigh Brewing Co.",
    date: "May 18",
    image: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=600&q=80",
  },
  {
    id: "5",
    title: "Neon Nights Festival",
    location: "Broadbeach Events Precinct",
    date: "May 24",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
  },
  {
    id: "6",
    title: "Jazz in the Park",
    location: "Southport Broadwater Parklands",
    date: "May 31",
    image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&q=80",
  },
];

const MOCK_COLLECTION = {
  title: "Weekend Warriors",
  description:
    "High-energy techno and house events to keep you moving all weekend long. From beachside sunset sessions to late-night warehouse raves, this collection has everything you need to plan the ultimate weekend of music and dancing on the Gold Coast.",
  eventCount: 12,
  curator: {
    name: "Sarah J.",
    specialty: "Indie & Alternative",
    bio: "Music lover, event curator, and proud Gold Coaster. I spend my weekends hunting down the best live experiences so you don't have to.",
    collectionsCount: 5,
    followersCount: 234,
  },
  heroImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="bg-surface-bright min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[300px] bg-inverse-surface overflow-hidden">
        <img
          src={MOCK_COLLECTION.heroImage}
          alt={MOCK_COLLECTION.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

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

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-primary text-on-primary px-3 py-1 rounded-full font-body text-xs font-semibold">
                {MOCK_COLLECTION.eventCount} Events
              </span>
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-body text-xs font-semibold">
                Music
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {MOCK_COLLECTION.title}
            </h1>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm" />
              <span className="font-body text-sm text-white/90">
                Curated by <span className="font-semibold">{MOCK_COLLECTION.curator.name}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Events Section (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Description */}
            <section>
              <h2 className="font-heading text-xl font-bold text-on-surface mb-3">About this collection</h2>
              <p className="font-body text-base text-secondary leading-relaxed">
                {MOCK_COLLECTION.description}
              </p>
            </section>

            {/* Event Cards Grid */}
            <section>
              <h2 className="font-heading text-xl font-bold text-on-surface mb-4">Events</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {MOCK_EVENTS.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="card-hover bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm overflow-hidden group"
                  >
                    <div className="relative aspect-video bg-surface-container-high overflow-hidden">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="bg-primary text-on-primary px-3 py-1 rounded-full font-body text-xs font-semibold shadow-md">
                          {event.date}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-base font-bold text-on-surface mb-1.5 line-clamp-1">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        <span className="font-body text-sm line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Curator Sidebar (4 cols) */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Curator Card */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-6 shadow-sm">
                <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Curator</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                      person
                    </span>
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-on-surface">{MOCK_COLLECTION.curator.name}</p>
                    <p className="font-body text-xs text-secondary">{MOCK_COLLECTION.curator.specialty}</p>
                  </div>
                </div>
                <p className="font-body text-sm text-secondary leading-relaxed mb-4">
                  {MOCK_COLLECTION.curator.bio}
                </p>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-center">
                    <p className="font-heading text-lg font-bold text-on-surface">{MOCK_COLLECTION.curator.collectionsCount}</p>
                    <p className="font-body text-xs text-secondary">Collections</p>
                  </div>
                  <div className="w-px h-8 bg-surface-container-high" />
                  <div className="text-center">
                    <p className="font-heading text-lg font-bold text-on-surface">{MOCK_COLLECTION.curator.followersCount}</p>
                    <p className="font-body text-xs text-secondary">Followers</p>
                  </div>
                </div>
                <button className="w-full bg-primary text-on-primary font-body text-sm font-semibold py-2.5 rounded-full hover:shadow-md transition-all">
                  Follow Curator
                </button>
              </div>

              {/* Share / Actions Card */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-6 shadow-sm">
                <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Share Collection</h3>
                <div className="flex items-center gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-surface-bright border border-surface-container-high rounded-lg py-2.5 font-body text-sm text-on-surface hover:shadow-sm transition-all">
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    Copy Link
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-surface-bright border border-surface-container-high rounded-lg py-2.5 font-body text-sm text-on-surface hover:shadow-sm transition-all">
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
