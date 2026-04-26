"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "off_topic", label: "Off-topic" },
  { value: "other", label: "Something else" },
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: "thread" | "reply";
  targetId: string;
}

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: ReportModalProps) {
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("input,textarea,button")?.addEventListener;
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === "other" && detail.trim().length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/discussions/${targetType === "thread" ? "threads" : "replies"}/${targetId}/report`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reason,
            detail: detail.trim() || undefined,
          }),
        }
      );
      if (res.status === 409) {
        toast("You've already reported this.", "error");
      } else if (!res.ok) {
        toast("Couldn't submit report. Try again.", "error");
      } else {
        toast("Report sent. Thanks for keeping things friendly.");
        onClose();
        setReason("spam");
        setDetail("");
      }
    } catch {
      toast("Couldn't submit report. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="report-modal-title"
          className="font-heading text-xl font-bold text-on-surface"
        >
          Report this {targetType}
        </h3>
        <p className="font-body text-sm text-on-surface-variant">
          Reports go to our moderation team. Don&apos;t use this for stuff you just
          disagree with.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="font-body text-sm font-semibold text-on-surface mb-1">
              Reason
            </legend>
            {REASONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-primary"
                />
                <span className="font-body text-sm text-on-surface">
                  {r.label}
                </span>
              </label>
            ))}
          </fieldset>
          {reason === "other" && (
            <label className="block space-y-1">
              <span className="font-body text-sm font-semibold text-on-surface">
                Tell us a bit more (required)
              </span>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                maxLength={1000}
                required
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm font-body text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-secondary hover:bg-surface-container-low font-body text-sm font-semibold px-4 py-2 rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (reason === "other" && detail.trim().length === 0)}
              className="bg-primary text-on-primary font-body text-sm font-semibold px-5 py-2 rounded-full hover:shadow-md disabled:opacity-60 transition-all"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
