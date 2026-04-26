"use client";

import { useEffect } from "react";

export default function DiscussionsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[discussions]", error);
  }, [error]);

  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
        <span
          className="material-symbols-outlined text-5xl text-secondary"
          aria-hidden="true"
        >
          cloud_off
        </span>
        <h1 className="font-display text-3xl font-extrabold text-on-surface tracking-tight">
          Couldn&apos;t load discussions.
        </h1>
        <p className="font-body text-base text-secondary">
          Give it another go in a sec.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-body text-sm font-semibold px-6 py-3 rounded-full hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            refresh
          </span>
          Try again
        </button>
      </div>
    </div>
  );
}
