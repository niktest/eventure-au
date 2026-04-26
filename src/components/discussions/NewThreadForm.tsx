"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DISCUSSION_CATEGORIES,
  type DiscussionCategory,
} from "@/lib/discussions/categories";
import type { LinkedEventSummary } from "@/types/discussions";
import { EventPicker } from "./EventPicker";
import { useToast } from "./Toast";

interface NewThreadFormProps {
  defaultCity: string;
  authorHandle: string | null;
  initialEventSlug?: string;
}

const TITLE_MIN = 5;
const TITLE_MAX = 120;
const BODY_MAX = 5000;

export function NewThreadForm({
  defaultCity,
  authorHandle,
  initialEventSlug,
}: NewThreadFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<DiscussionCategory>("general");
  const [event, setEvent] = useState<LinkedEventSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!initialEventSlug) return;
    let cancelled = false;
    fetch(`/api/events/search?q=${encodeURIComponent(initialEventSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const match =
          data.events?.find((e: LinkedEventSummary) => e.slug === initialEventSlug) ??
          null;
        if (match) setEvent(match);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialEventSlug]);

  const titleTooShort = title.trim().length > 0 && title.trim().length < TITLE_MIN;
  const titleTooLong = title.length > TITLE_MAX;
  const canSubmit =
    !submitting &&
    title.trim().length >= TITLE_MIN &&
    !titleTooLong &&
    body.length <= BODY_MAX;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/discussions/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          linkedEventSlug: event?.slug,
        }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Slow down a sec — you're posting fast.");
      } else if (!res.ok) {
        setError("Couldn't post your thread. Try again — your text is safe.");
      } else {
        const data = await res.json();
        toast("Thread posted — go talk to people 👋");
        router.push(`/discussions/${data.slug}`);
      }
    } catch {
      setError("Couldn't post your thread. Try again — your text is safe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Link
        href="/discussions"
        className="inline-flex items-center gap-1 font-body text-sm font-semibold text-secondary hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          arrow_back
        </span>
        Back to Discussions
      </Link>

      <header className="space-y-2">
        <h1
          className="font-display text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Start a thread
        </h1>
        <p className="font-body text-sm text-secondary">
          Posting as <span className="font-semibold text-on-surface">@{authorHandle ?? "you"}</span> in {defaultCity}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error/10 text-error font-body text-sm p-3"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="thread-category"
          className="font-body text-sm font-semibold text-on-surface"
        >
          Category <span className="text-error">*</span>
        </label>
        <select
          id="thread-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DiscussionCategory)}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {DISCUSSION_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="thread-title"
            className="font-body text-sm font-semibold text-on-surface"
          >
            Title <span className="text-error">*</span>
          </label>
          <span
            className={
              "font-body text-xs tabular-nums " +
              (titleTooLong ? "text-error" : "text-secondary")
            }
          >
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <input
          id="thread-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          className={
            "w-full rounded-lg border bg-surface-container-lowest p-3 font-body text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 " +
            (titleTooShort || titleTooLong
              ? "border-error focus:border-error"
              : "border-outline-variant focus:border-primary")
          }
          aria-invalid={titleTooShort || titleTooLong}
          aria-describedby="title-help"
        />
        <p id="title-help" className="font-body text-xs text-secondary">
          {titleTooShort
            ? "Titles need to be at least 5 characters."
            : titleTooLong
              ? "Keep it under 120 characters."
              : "5–120 characters. Be specific — “Bluesfest carpool from Coolangatta” beats “festival??”."}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="thread-body"
            className="font-body text-sm font-semibold text-on-surface"
          >
            Body
          </label>
          <span
            className={
              "font-body text-xs tabular-nums " +
              (body.length > BODY_MAX ? "text-error" : "text-secondary")
            }
          >
            {body.length}/{BODY_MAX}
          </span>
        </div>
        <textarea
          id="thread-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Add some context — what are you looking for, what's the vibe?"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body text-base text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="font-body text-xs text-secondary">
          Optional. Up to 5000 characters. Plain text for now (links auto-detect).
        </p>
      </div>

      <div className="space-y-2">
        <label className="font-body text-sm font-semibold text-on-surface">
          Link to an event
        </label>
        <EventPicker value={event} onChange={setEvent} />
      </div>

      <hr className="border-outline-variant/40" />

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="font-body text-xs text-secondary">
          By posting you agree to our{" "}
          <Link href="/community#guidelines" className="text-primary hover:underline">
            community guidelines
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 sm:justify-end">
          <Link
            href="/discussions"
            className="text-secondary hover:bg-surface-container-low font-body text-sm font-semibold px-4 py-2.5 rounded-full"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-primary text-on-primary font-body text-sm font-semibold px-6 py-2.5 rounded-full hover:shadow-md disabled:opacity-60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {submitting ? "Posting…" : "Post thread"}
          </button>
        </div>
      </div>
    </form>
  );
}
