import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trending Discussions",
  description: "Join the conversation — explore trending discussions about events, festivals, music, and more on Eventure Discovery.",
};

const FILTER_CHIPS = ["All", "Music", "Festivals", "Food", "Arts"] as const;

const MOCK_DISCUSSIONS = [
  {
    id: "1",
    title: "Boiler Room: Gold Coast Edition",
    preview:
      "\"Anyone know who the secret guest is? Rumor has it it's someone huge but I'm not convinced it'll top last year's lineup...\"",
    replies: 42,
    likes: 128,
    timeAgo: "2h ago",
    image: "https://images.unsplash.com/photo-1571266028243-d220c6a050d2?w=100&q=80",
    category: "Music",
  },
  {
    id: "2",
    title: "Festival season prep thread",
    preview:
      "\"First time going to a multi-day festival. What are the absolute essentials I need to pack? Any tips from seasoned veterans?\"",
    replies: 89,
    likes: 45,
    timeAgo: "5h ago",
    image: null,
    icon: "camping",
    category: "Festivals",
  },
  {
    id: "3",
    title: "Best food trucks at Broadbeach markets?",
    preview:
      "\"Heading to the night markets this Saturday — which food trucks are must-tries? Keen for recommendations beyond the usual suspects.\"",
    replies: 31,
    likes: 67,
    timeAgo: "8h ago",
    image: null,
    icon: "restaurant",
    category: "Food",
  },
  {
    id: "4",
    title: "HOTA Gallery new immersive exhibit",
    preview:
      "\"Just walked through the new light installation at HOTA and it completely blew my mind. The way they mix sound design with visuals is next level.\"",
    replies: 18,
    likes: 93,
    timeAgo: "1d ago",
    image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=100&q=80",
    category: "Arts",
  },
];

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
              Trending Discussions
            </h1>
          </div>
          <p className="font-body text-lg text-secondary max-w-2xl">
            See what the community is buzzing about — jump into conversations, share your takes, and connect with fellow event-goers.
          </p>
        </section>

        {/* Filter Chips */}
        <section className="flex flex-wrap gap-3">
          {FILTER_CHIPS.map((chip, index) => (
            <button
              key={chip}
              className={`font-body text-sm font-semibold px-5 py-2 rounded-full transition-colors ${
                index === 0
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {chip}
            </button>
          ))}
        </section>

        {/* Discussion Thread Cards */}
        <section className="space-y-4">
          {MOCK_DISCUSSIONS.map((discussion) => (
            <Link
              key={discussion.id}
              href={`/discussions/${discussion.id}`}
              className="block bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                  {discussion.image ? (
                    <img
                      src={discussion.image}
                      alt={discussion.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-dim flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary">
                        {discussion.icon}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <h3 className="font-heading text-lg font-bold text-on-surface">
                      {discussion.title}
                    </h3>
                    <span className="font-body text-xs text-secondary bg-surface-container-low px-2 py-1 rounded-md whitespace-nowrap">
                      {discussion.timeAgo}
                    </span>
                  </div>
                  <p className="font-body text-base text-secondary mb-3 line-clamp-2">
                    {discussion.preview}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-[18px]">
                        chat_bubble
                      </span>
                      <span className="font-body text-xs font-semibold">
                        {discussion.replies} replies
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        favorite
                      </span>
                      <span className="font-body text-xs font-semibold">
                        {discussion.likes} likes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>

      {/* Floating Action Button — Start a Discussion (mobile) */}
      <Link
        href="/discussions/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center md:hidden hover:shadow-xl transition-shadow"
        aria-label="Start a Discussion"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </Link>
    </div>
  );
}
