import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Hub",
  description: "Explore curated collections, join trending conversations, and connect with curators on Eventure.",
};

const MOCK_COLLECTIONS = [
  {
    slug: "weekend-warriors",
    title: "Weekend Warriors",
    description: "High-energy techno and house events to keep you moving all weekend long.",
    tag: "Top Rated",
    eventCount: 12,
    featured: true,
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
  },
  {
    slug: "rave-squad",
    title: "Rave Squad",
    description: "Underground scenes and secret warehouse parties curated by local legends.",
    tag: null,
    eventCount: 8,
    featured: false,
    image: null,
    icon: "nightlife",
    followers: 11,
  },
];

const MOCK_CONVERSATIONS = [
  {
    id: "1",
    title: "Boiler Room: Gold Coast Edition",
    excerpt: "\"Anyone know who the secret guest is? Rumor has it it's someone huge but I'm not convinced...\"",
    replies: 42,
    likes: 128,
    timeAgo: "2h ago",
    image: "https://images.unsplash.com/photo-1571266028243-d220c6a050d2?w=100&q=80",
  },
  {
    id: "2",
    title: "Festival season prep thread",
    excerpt: "\"First time going to a multi-day festival. What are the absolute essentials I need to pack?\"",
    replies: 89,
    likes: 45,
    timeAgo: "5h ago",
    image: null,
    icon: "camping",
  },
];

const MOCK_CURATORS = [
  { name: "Sarah J.", specialty: "Indie & Alternative", avatar: null },
  { name: "Marcus T.", specialty: "Techno & House", avatar: null },
  { name: "Elena R.", specialty: "Art Exhibitions", avatar: null },
];

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

        {/* Collections Bento Grid */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">Curated Collections</h2>
            <Link href="/collections/create" className="font-body text-sm font-semibold text-primary hover:underline">
              Create Collection
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" style={{ gridAutoRows: "280px" }}>
            {/* Large Featured Collection */}
            <Link
              href={`/collections/${MOCK_COLLECTIONS[0].slug}`}
              className="md:col-span-8 relative rounded-xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <img
                src={MOCK_COLLECTIONS[0].image!}
                alt={MOCK_COLLECTIONS[0].title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-surface-tint text-on-primary px-3 py-1 rounded-full font-body text-xs font-semibold">
                    {MOCK_COLLECTIONS[0].tag}
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-body text-xs font-semibold">
                    {MOCK_COLLECTIONS[0].eventCount} Events
                  </span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-white mb-1">
                  {MOCK_COLLECTIONS[0].title}
                </h3>
                <p className="font-body text-base text-white/80 line-clamp-1">
                  {MOCK_COLLECTIONS[0].description}
                </p>
              </div>
            </Link>

            {/* Solid Color Collection */}
            <Link
              href={`/collections/${MOCK_COLLECTIONS[1].slug}`}
              className="md:col-span-4 bg-primary-container rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-sm transition-all duration-300"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-on-primary-container/10 rounded-full blur-2xl" />
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-on-primary-container text-primary-container mb-4">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    nightlife
                  </span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-on-primary-container">
                  {MOCK_COLLECTIONS[1].title}
                </h3>
                <p className="font-body text-base text-on-primary-container/80 mt-2">
                  {MOCK_COLLECTIONS[1].description}
                </p>
              </div>
              <div className="flex items-center gap-1 mt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-primary-container bg-surface-dim"
                    />
                  ))}
                </div>
                <span className="font-body text-xs text-on-primary-container/70 ml-2">
                  +{MOCK_COLLECTIONS[1].followers} followers
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Trending Conversations & Curators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Trending Conversations */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight">
                Trending Conversations
              </h2>
            </div>

            <div className="space-y-4">
              {MOCK_CONVERSATIONS.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/discussions`}
                  className="block bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container hover:-translate-y-1 transition-transform duration-200"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      {conv.image ? (
                        <img src={conv.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-tertiary">{conv.icon}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-heading text-lg font-bold text-on-surface">{conv.title}</h3>
                        <span className="font-body text-xs text-secondary bg-surface-container-low px-2 py-1 rounded-md">
                          {conv.timeAgo}
                        </span>
                      </div>
                      <p className="font-body text-base text-secondary mb-3 line-clamp-2">{conv.excerpt}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-secondary">
                          <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                          <span className="font-body text-xs font-semibold">{conv.replies} replies</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            favorite
                          </span>
                          <span className="font-body text-xs font-semibold">{conv.likes} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Curators Sidebar */}
          <aside className="space-y-6">
            <h2 className="font-heading text-2xl font-bold text-on-surface tracking-tight">
              Popular Curators
            </h2>
            <div className="bg-surface-container-low rounded-xl p-6 space-y-4 border border-outline-variant/30">
              {MOCK_CURATORS.map((curator) => (
                <div key={curator.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-dim ring-2 ring-transparent group-hover:ring-primary transition-all" />
                    <div>
                      <p className="font-body text-sm font-semibold text-on-surface">{curator.name}</p>
                      <p className="font-body text-xs text-secondary">{curator.specialty}</p>
                    </div>
                  </div>
                  <button className="bg-surface-container-highest text-on-surface font-body text-xs font-semibold px-3 py-1 rounded-full border border-outline-variant hover:bg-surface-dim transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
