import { EventCardSkeletonGrid } from "@/components/EventCardSkeleton";

export default function Loading() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <section className="relative overflow-hidden bg-inverse-surface px-6 pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="relative z-10 mx-auto max-w-[1280px]">
          <h1
            className="mb-3 font-display text-4xl font-extrabold text-white md:text-5xl tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Happening Today
          </h1>
          <p className="max-w-xl font-body text-lg text-surface-variant">
            Loading today&apos;s events…
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] px-6 py-12">
        <EventCardSkeletonGrid count={9} />
      </section>
    </div>
  );
}
