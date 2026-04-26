"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DISCUSSION_CATEGORIES,
  type DiscussionCategory,
} from "@/lib/discussions/categories";

interface CategoryChipRowProps {
  active: DiscussionCategory | "all";
}

export function CategoryChipRow({ active }: CategoryChipRowProps) {
  const router = useRouter();
  const params = useSearchParams();

  const buildHref = useCallback(
    (value: DiscussionCategory | "all") => {
      const next = new URLSearchParams(params?.toString() ?? "");
      if (value === "all") next.delete("category");
      else next.set("category", value);
      next.delete("cursor");
      const qs = next.toString();
      return `/discussions${qs ? `?${qs}` : ""}`;
    },
    [params]
  );

  const onActivate = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, value: DiscussionCategory | "all") => {
      e.preventDefault();
      router.replace(buildHref(value), { scroll: false });
    },
    [buildHref, router]
  );

  const items: Array<{ value: DiscussionCategory | "all"; label: string }> = [
    { value: "all", label: "All" },
    ...DISCUSSION_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  ];

  return (
    <nav
      aria-label="Filter by category"
      className="-mx-1 flex items-center gap-2 overflow-x-auto pb-1"
    >
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <Link
            key={item.value}
            href={buildHref(item.value)}
            onClick={(e) => onActivate(e, item.value)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 font-body text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
              (isActive
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container")
            }
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
