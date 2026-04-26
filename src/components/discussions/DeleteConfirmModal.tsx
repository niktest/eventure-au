"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  targetType: "thread" | "reply";
  targetId: string;
}

export function DeleteConfirmModal({
  open,
  onClose,
  onDeleted,
  targetType,
  targetId,
}: DeleteConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      const url = `/api/discussions/${targetType === "thread" ? "threads" : "replies"}/${targetId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("delete-failed");
      toast("Post deleted.");
      onDeleted();
    } catch {
      toast("Couldn't delete. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="delete-modal-title"
          className="font-heading text-xl font-bold text-on-surface"
        >
          Delete this {targetType}?
        </h3>
        <p className="font-body text-sm text-on-surface-variant">
          {targetType === "thread"
            ? "Replies will stay visible but your post will be removed. This can't be undone."
            : "This can't be undone."}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:bg-surface-container-low font-body text-sm font-semibold px-4 py-2 rounded-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="bg-error text-white font-body text-sm font-semibold px-5 py-2 rounded-full hover:bg-error/90 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
