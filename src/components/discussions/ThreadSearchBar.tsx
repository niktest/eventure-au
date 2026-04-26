"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEBOUNCE_MS = 300;

export function ThreadSearchBar({ initialQuery }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery ?? "");
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSyncedRef = useRef<string>(initialQuery ?? "");

  useEffect(() => {
    if (value === lastSyncedRef.current) return;
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(params?.toString() ?? "");
      if (value.trim().length === 0) next.delete("q");
      else next.set("q", value.trim());
      next.delete("cursor");
      lastSyncedRef.current = value;
      router.replace(`/discussions${next.toString() ? `?${next}` : ""}`);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, router, params]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <span
        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[20px]"
        aria-hidden="true"
      >
        search
      </span>
      <label htmlFor="discussions-search" className="sr-only">
        Search discussions
      </label>
      <input
        id="discussions-search"
        ref={inputRef}
        type="search"
        placeholder="Search threads…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-3 pl-11 pr-16 text-sm font-body text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px] text-secondary bg-surface-container-low">
        ⌘K
      </kbd>
    </div>
  );
}
