import { ThreadDetailSkeleton } from "@/components/discussions/skeletons";

export default function ThreadLoading() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <ThreadDetailSkeleton />
      </div>
    </div>
  );
}
