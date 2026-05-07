export function EventCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-surface-bright rounded-xl overflow-hidden shadow-sm border border-surface-container-high flex flex-col"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-surface-container-low animate-pulse" />
      <div className="p-6 flex-grow flex flex-col">
        <div className="h-5 w-3/4 rounded bg-surface-container-low animate-pulse mb-3" />
        <div className="h-4 w-full rounded bg-surface-container-low animate-pulse mb-2" />
        <div className="h-4 w-5/6 rounded bg-surface-container-low animate-pulse mb-6" />
        <div className="mt-auto h-4 w-1/2 rounded bg-surface-container-low animate-pulse" />
      </div>
    </div>
  );
}

export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      data-testid="event-card-skeleton-grid"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
