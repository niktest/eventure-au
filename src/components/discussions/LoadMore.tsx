"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function LoadMore({ cursor }: { cursor: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("cursor", cursor);
    startTransition(() => {
      router.replace(`/discussions?${next.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-lowest text-on-surface font-body text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? (
          <>
            <span
              className="material-symbols-outlined text-[18px] animate-spin"
              aria-hidden="true"
            >
              progress_activity
            </span>
            Loading…
          </>
        ) : (
          <>
            Load more
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              expand_more
            </span>
          </>
        )}
      </button>
    </div>
  );
}
