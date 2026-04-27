"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReplySort, ReplySummary } from "@/types/discussions";
import { RepliesHeader } from "./RepliesHeader";
import { ReplyCard } from "./ReplyCard";
import { ReplyComposer } from "./ReplyComposer";

interface RepliesSectionProps {
  threadId: string;
  threadSlug: string;
  isSignedIn: boolean;
  authorHandle: string | null;
  initialReplies: ReplySummary[];
  replySort: ReplySort;
}

const PULSE_MS = 1500;

export function RepliesSection({
  threadId,
  threadSlug,
  isSignedIn,
  authorHandle,
  initialReplies,
  replySort,
}: RepliesSectionProps) {
  const [optimistic, setOptimistic] = useState<ReplySummary[]>([]);
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const initialIds = new Set(initialReplies.map((r) => r.id));
  const visible = [
    ...initialReplies,
    ...optimistic.filter((r) => !initialIds.has(r.id)),
  ];

  const handleInsert = useCallback(
    (reply: ReplySummary) => {
      setOptimistic((prev) =>
        prev.some((r) => r.id === reply.id) ? prev : [...prev, reply]
      );
      setPulseIds((prev) => {
        const next = new Set(prev);
        next.add(reply.id);
        return next;
      });
      window.setTimeout(() => {
        setPulseIds((prev) => {
          const next = new Set(prev);
          next.delete(reply.id);
          return next;
        });
      }, PULSE_MS);
      router.refresh();
      window.requestAnimationFrame(() => {
        document
          .getElementById(`reply-${reply.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [router]
  );

  return (
    <>
      <RepliesHeader
        sort={replySort}
        count={visible.length}
        slug={threadSlug}
      />

      {visible.length === 0 ? (
        <p className="font-body text-sm text-secondary text-center py-6">
          No replies yet — kick it off.
        </p>
      ) : (
        <div className="space-y-3" aria-live="polite" aria-label="Replies">
          {visible.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              isSignedIn={isSignedIn}
              redirectTo={`/discussions/${threadSlug}#reply-${reply.id}`}
              pulse={pulseIds.has(reply.id)}
            />
          ))}
        </div>
      )}

      <hr className="border-outline-variant/40" />

      <ReplyComposer
        threadId={threadId}
        threadSlug={threadSlug}
        isSignedIn={isSignedIn}
        authorHandle={authorHandle}
        onInsert={handleInsert}
      />
    </>
  );
}
