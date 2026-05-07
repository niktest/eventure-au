import { EventCardSkeletonGrid } from "@/components/EventCardSkeleton";

export default function Loading() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <section
        aria-hidden="true"
        className="relative w-full h-[280px] md:h-[480px] bg-surface-container-low animate-pulse"
      />
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 mt-4 md:-mt-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-bright rounded-xl p-6 md:p-8 shadow-md border border-surface-container-high">
            <div
              aria-hidden="true"
              className="h-6 w-24 rounded-full bg-surface-container-low animate-pulse mb-4"
            />
            <div
              aria-hidden="true"
              className="h-10 w-3/4 rounded bg-surface-container-low animate-pulse mb-3"
            />
            <div
              aria-hidden="true"
              className="h-4 w-full rounded bg-surface-container-low animate-pulse mb-2"
            />
            <div
              aria-hidden="true"
              className="h-4 w-2/3 rounded bg-surface-container-low animate-pulse"
            />
          </div>
        </div>
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div
            aria-hidden="true"
            className="bg-surface-bright rounded-xl p-6 shadow-md border border-surface-container-high h-72 animate-pulse"
          />
        </div>
      </div>
      <section className="max-w-[1280px] mx-auto px-6 md:px-12 pb-16 space-y-6">
        <div
          aria-hidden="true"
          className="h-8 w-72 rounded bg-surface-container-low animate-pulse"
        />
        <EventCardSkeletonGrid count={3} />
      </section>
    </div>
  );
}
