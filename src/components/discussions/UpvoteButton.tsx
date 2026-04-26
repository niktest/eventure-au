"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface UpvoteButtonProps {
  targetType: "thread" | "reply";
  targetId: string;
  initialCount: number;
  initialUpvoted: boolean;
  isSignedIn: boolean;
  redirectTo: string;
  size?: "sm" | "md";
}

export function UpvoteButton({
  targetType,
  targetId,
  initialCount,
  initialUpvoted,
  isSignedIn,
  redirectTo,
  size = "md",
}: UpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onClick = async () => {
    if (!isSignedIn) {
      router.push(`/login?next=${encodeURIComponent(redirectTo)}`);
      return;
    }
    if (pending) return;
    const nextUpvoted = !upvoted;
    const url = `/api/discussions/${targetType === "thread" ? "threads" : "replies"}/${targetId}/upvote`;
    const prevCount = count;
    setUpvoted(nextUpvoted);
    setCount((c) => (nextUpvoted ? c + 1 : Math.max(0, c - 1)));
    try {
      const res = await fetch(url, { method: nextUpvoted ? "POST" : "DELETE" });
      if (!res.ok) throw new Error("upvote-failed");
      startTransition(() => router.refresh());
    } catch {
      setUpvoted(!nextUpvoted);
      setCount(prevCount);
      toast("Upvote didn't save, try again.", "error");
    }
  };

  const iconSize = size === "sm" ? "text-[18px]" : "text-[20px]";
  const padding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={upvoted}
      aria-label={`${upvoted ? "Remove upvote" : "Upvote"}, ${count} so far`}
      title={!isSignedIn ? "Sign in to upvote" : undefined}
      className={
        `inline-flex items-center gap-1.5 rounded-full font-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${padding} ` +
        (upvoted
          ? "bg-primary/10 text-primary"
          : "text-secondary hover:bg-surface-container-low")
      }
    >
      <span
        className={`material-symbols-outlined ${iconSize}`}
        style={upvoted ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden="true"
      >
        arrow_upward
      </span>
      <span className="text-sm tabular-nums">{count}</span>
    </button>
  );
}
