import { EventCardSkeletonGrid } from "@/components/EventCardSkeleton";

export default function Loading() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-6 py-12">
        <div className="mb-8">
          <h1
            className="font-display text-4xl font-extrabold text-on-surface tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Browse Events
          </h1>
          <p className="mt-2 font-body text-lg text-secondary">
            Discover what&apos;s happening near you
          </p>
        </div>
        <div
          aria-hidden="true"
          className="mb-8 h-12 rounded-lg bg-surface-container-low animate-pulse"
        />
        <EventCardSkeletonGrid count={9} />
      </div>
    </div>
  );
}
