"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ThreadDetail } from "@/types/discussions";
import { UpvoteButton } from "./UpvoteButton";
import { OverflowMenu, type OverflowAction } from "./OverflowMenu";
import { ReportModal } from "./ReportModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useToast } from "./Toast";

interface ThreadActionsProps {
  thread: ThreadDetail;
  isSignedIn: boolean;
  canEdit: boolean;
  shareUrl: string;
}

export function ThreadActions({
  thread,
  isSignedIn,
  canEdit,
  shareUrl,
}: ThreadActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Link copied to clipboard.");
    } catch {
      toast("Couldn't copy link.", "error");
    }
  };

  const overflowActions: OverflowAction[] = [];
  if (canEdit) {
    overflowActions.push({
      label: "Edit",
      icon: "edit",
      onSelect: () => router.push(`/discussions/${thread.slug}/edit`),
      disabled: true, // inline edit is a v1.5 — this is a placeholder
    });
    overflowActions.push({
      label: "Delete",
      icon: "delete",
      tone: "danger",
      onSelect: () => setDeleteOpen(true),
    });
  }
  if (isSignedIn && !thread.isAuthor) {
    overflowActions.push({
      label: "Report",
      icon: "flag",
      onSelect: () => setReportOpen(true),
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <UpvoteButton
          targetType="thread"
          targetId={thread.id}
          initialCount={thread.upvoteCount}
          initialUpvoted={thread.upvotedByMe}
          isSignedIn={isSignedIn}
          redirectTo={`/discussions/${thread.slug}`}
        />
        <a
          href="#replies"
          className="inline-flex items-center gap-1.5 text-secondary hover:bg-surface-container-low rounded-full px-3 py-1.5 font-body text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            chat_bubble_outline
          </span>
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </a>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1.5 text-secondary hover:bg-surface-container-low rounded-full px-3 py-1.5 font-body text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            link
          </span>
          Copy link
        </button>
        <OverflowMenu actions={overflowActions} ariaLabel="More actions" />
      </div>
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="thread"
        targetId={thread.id}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          router.refresh();
        }}
        targetType="thread"
        targetId={thread.id}
      />
    </>
  );
}
