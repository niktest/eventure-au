import { DiscussionsIndexSkeleton } from "@/components/discussions/skeletons";

export default function DiscussionsLoading() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-12">
        <DiscussionsIndexSkeleton />
      </div>
    </div>
  );
}
