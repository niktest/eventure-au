"use client";

import { useState } from "react";
import type { ReplySummary } from "@/types/discussions";
import { useToast } from "./Toast";
import { LoginGate } from "./LoginGate";

interface ReplyComposerProps {
  threadId: string;
  threadSlug: string;
  isSignedIn: boolean;
  authorHandle: string | null;
  onInsert?: (reply: ReplySummary) => void;
}

const MAX_LEN = 2000;

export function ReplyComposer({
  threadId,
  threadSlug,
  isSignedIn,
  authorHandle,
  onInsert,
}: ReplyComposerProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  if (!isSignedIn) {
    return (
      <LoginGate
        context="reply"
        redirectTo={`/discussions/${threadSlug}`}
      />
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/discussions/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: value }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Slow down a sec — you're posting fast.");
      } else if (!res.ok) {
        setError("Couldn't post your reply. Check your connection and try again.");
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          reply?: ReplySummary;
        };
        setValue("");
        toast("Reply posted ✓");
        if (data.reply && onInsert) {
          onInsert(data.reply);
        }
      }
    } catch {
      setError("Couldn't post your reply. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = MAX_LEN - value.length;
  const overLimit = remaining < 0;

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Reply to thread"
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between text-sm font-body">
        <span className="text-secondary">
          Replying as <span className="font-semibold text-on-surface">@{authorHandle ?? "you"}</span>
          <span className="hidden sm:inline"> · Be kind, no spam, no self-promo.</span>
        </span>
      </div>
      <label htmlFor="reply-body" className="sr-only">
        Add to the conversation
      </label>
      <textarea
        id="reply-body"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add to the conversation…"
        rows={4}
        maxLength={MAX_LEN + 200}
        required
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-base font-body text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[96px]"
      />
      {error && (
        <p
          role="alert"
          className="text-sm font-body text-error bg-error/10 border border-error/30 rounded-lg p-3"
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            "text-xs font-body tabular-nums " +
            (overLimit ? "text-error" : "text-secondary")
          }
        >
          {value.length}/{MAX_LEN}
        </span>
        <button
          type="submit"
          disabled={submitting || value.trim().length === 0 || overLimit}
          className="bg-primary text-on-primary font-body text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-md disabled:opacity-60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {submitting ? "Posting…" : "Post reply"}
        </button>
      </div>
    </form>
  );
}
