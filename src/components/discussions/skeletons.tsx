import { ThreadCardSkeleton } from "./ThreadCard";

export function DiscussionsIndexSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-12 w-2/3 bg-surface-container-low rounded animate-pulse" />
      <div className="h-10 w-full bg-surface-container-low rounded-full animate-pulse" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 bg-surface-container-low rounded-full animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ThreadCardSkeleton key={i} />
          ))}
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="h-44 w-full bg-surface-container-low rounded-xl animate-pulse" />
          <div className="h-40 w-full bg-surface-container-low rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ThreadDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-4 w-24 bg-surface-container-low rounded animate-pulse" />
      <div className="h-3 w-1/3 bg-surface-container-low rounded animate-pulse" />
      <div className="h-10 w-3/4 bg-surface-container-low rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-surface-container-low rounded animate-pulse" />
        <div className="h-4 w-11/12 bg-surface-container-low rounded animate-pulse" />
        <div className="h-4 w-9/12 bg-surface-container-low rounded animate-pulse" />
      </div>
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-full bg-surface-container-low rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
