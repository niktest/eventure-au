"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReplySummary } from "@/types/discussions";
import { UpvoteButton } from "./UpvoteButton";
import { OverflowMenu, type OverflowAction } from "./OverflowMenu";
import { ReportModal } from "./ReportModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { autolink } from "@/lib/discussions/autolink";
import { timeAgo } from "@/lib/discussions/time-ago";

interface ReplyCardProps {
  reply: ReplySummary;
  isSignedIn: boolean;
  redirectTo: string;
}

export function ReplyCard({ reply, isSignedIn, redirectTo }: ReplyCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const isDeleted = reply.deletedAt !== null;
  const isHidden = reply.hiddenAt !== null;

  const overflowActions: OverflowAction[] = [];
  if (reply.isAuthor && !isDeleted) {
    overflowActions.push({
      label: "Delete",
      icon: "delete",
      tone: "danger",
      onSelect: () => setDeleteOpen(true),
    });
  }
  if (isSignedIn && !reply.isAuthor && !isDeleted && !isHidden) {
    overflowActions.push({
      label: "Report",
      icon: "flag",
      onSelect: () => setReportOpen(true),
    });
  }

  return (
    <article
      id={`reply-${reply.id}`}
      className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-body text-secondary">
          <span className="font-semibold text-on-surface">
            @{reply.author.handle}
          </span>{" "}
          · {timeAgo(reply.createdAt)}
          {reply.editedAt && (
            <span className="text-xs"> · edited</span>
          )}
        </div>
        <OverflowMenu actions={overflowActions} ariaLabel="Reply options" />
      </div>
      <div className="font-body text-base text-on-surface whitespace-pre-line">
        {isDeleted ? (
          <em className="text-secondary">
            This reply was deleted by the author.
          </em>
        ) : isHidden ? (
          <em className="text-secondary">
            This reply is hidden pending review.
          </em>
        ) : (
          autolink(reply.body)
        )}
      </div>
      {!isDeleted && !isHidden && (
        <div className="flex items-center justify-start">
          <UpvoteButton
            targetType="reply"
            targetId={reply.id}
            initialCount={reply.upvoteCount}
            initialUpvoted={reply.upvotedByMe}
            isSignedIn={isSignedIn}
            redirectTo={redirectTo}
            size="sm"
          />
        </div>
      )}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="reply"
        targetId={reply.id}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          router.refresh();
        }}
        targetType="reply"
        targetId={reply.id}
      />
    </article>
  );
}
