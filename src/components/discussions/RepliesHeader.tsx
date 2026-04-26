"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReplySort } from "@/types/discussions";

const SORTS: Array<{ value: ReplySort; label: string }> = [
  { value: "top", label: "Top" },
  { value: "new", label: "New" },
];

export function RepliesHeader({
  sort,
  count,
  slug,
}: {
  sort: ReplySort;
  count: number;
  slug: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("rsort", e.target.value);
    router.replace(`/discussions/${slug}?${next.toString()}#replies`, {
      scroll: false,
    });
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      <h2 id="replies" className="font-heading text-lg font-bold text-on-surface">
        {count} {count === 1 ? "reply" : "replies"}
      </h2>
      <label className="inline-flex items-center gap-2 text-sm font-body text-secondary">
        <span>Sort by</span>
        <select
          value={sort}
          onChange={onChange}
          className="bg-surface-container-low border border-outline-variant rounded-full px-3 py-1.5 font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
