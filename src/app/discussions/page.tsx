import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listThreads,
  getTrendingEvents,
} from "@/lib/discussions/queries";
import {
  isDiscussionCategory,
  type DiscussionCategory,
} from "@/lib/discussions/categories";
import type { ThreadSort } from "@/types/discussions";
import { DiscussionsHero } from "@/components/discussions/Hero";
import { ThreadSearchBar } from "@/components/discussions/ThreadSearchBar";
import { CategoryChipRow } from "@/components/discussions/CategoryChipRow";
import { SortAndFilters } from "@/components/discussions/SortAndFilters";
import { ThreadCard } from "@/components/discussions/ThreadCard";
import { LoadMore } from "@/components/discussions/LoadMore";
import { TrendingEventsRail } from "@/components/discussions/TrendingEventsRail";
import { CommunityRulesCard } from "@/components/discussions/CommunityRulesCard";
import { EmptyState } from "@/components/discussions/EmptyState";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gold Coast Discussions",
  description:
    "Real talk from the Gold Coast events community — what's hot, what's worth your weekend, who's going.",
  openGraph: {
    title: "Gold Coast Discussions — Eventure",
    description:
      "Join Gold Coast event-goers chatting about gigs, festivals, markets and more.",
  },
};

const SORTS = new Set<ThreadSort>(["hot", "new", "top"]);

interface SearchParams {
  sort?: string;
  category?: string;
  q?: string;
  hasEvent?: string;
  mine?: string;
  cursor?: string;
}

export default async function DiscussionsIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const sort: ThreadSort = SORTS.has(sp.sort as ThreadSort)
    ? (sp.sort as ThreadSort)
    : "hot";
  const category: DiscussionCategory | undefined =
    sp.category && isDiscussionCategory(sp.category) ? sp.category : undefined;
  const query = sp.q?.trim() ?? "";
  const hasEvent = sp.hasEvent === "1";
  const mine = sp.mine === "1";
  const cursor = sp.cursor ?? undefined;

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const [{ threads, nextCursor }, trending, totalCount] = await Promise.all([
    listThreads({
      sort,
      category,
      query: query || undefined,
      hasEvent,
      mineUserId: mine && viewerId ? viewerId : undefined,
      cursor,
      viewerId,
    }),
    getTrendingEvents({ cityId: "gold-coast", limit: 5 }),
    prisma.thread.count({ where: { cityId: "gold-coast", hiddenAt: null } }),
  ]);

  const isFiltered = Boolean(category || query || hasEvent || mine);
  const showZeroCityEmpty = totalCount === 0;
  const showFilterEmpty =
    !showZeroCityEmpty && threads.length === 0 && isFiltered;

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-12 space-y-6 md:space-y-8">
        <DiscussionsHero
          city="Gold Coast"
          threadCount={totalCount}
          isSignedIn={Boolean(viewerId)}
        />

        <ThreadSearchBar initialQuery={query} />

        <CategoryChipRow active={category ?? "all"} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <SortAndFilters
              sort={sort}
              hasEvent={hasEvent}
              mine={mine}
              isSignedIn={Boolean(viewerId)}
            />

            {showZeroCityEmpty ? (
              <EmptyState isSignedIn={Boolean(viewerId)} context="zero-city" />
            ) : showFilterEmpty ? (
              <EmptyState
                isSignedIn={Boolean(viewerId)}
                context={query ? "search" : "filter"}
                query={query || undefined}
              />
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}
                {nextCursor && <LoadMore cursor={nextCursor} />}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <TrendingEventsRail events={trending} />
            <CommunityRulesCard />
          </div>
        </div>

        <p className="text-center font-body text-sm text-secondary pt-6">
          More cities coming soon — Brisbane, Sydney, Melbourne 🇦🇺
        </p>
      </div>
    </div>
  );
}
