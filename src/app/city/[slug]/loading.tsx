import { EventCardSkeletonGrid } from "@/components/EventCardSkeleton";

export default function Loading() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <section className="relative overflow-hidden bg-inverse-surface px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="relative z-10 mx-auto max-w-[1280px]">
          <div
            aria-hidden="true"
            className="mb-3 h-12 w-64 rounded bg-white/10 animate-pulse"
          />
          <p className="max-w-xl font-body text-lg text-surface-variant">
            Loading events…
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] px-6 py-12">
        <EventCardSkeletonGrid count={9} />
      </section>
    </div>
  );
}
