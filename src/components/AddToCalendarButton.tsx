"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  slug: string;
  googleUrl: string;
  outlookUrl: string;
};

export function AddToCalendarButton({ slug, googleUrl, outlookUrl }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const icsUrl = `/events/${slug}/calendar.ics`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full border-2 border-secondary text-secondary rounded-full py-3 font-body text-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">event</span>
        Add to calendar
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 mt-2 z-20 bg-surface-bright border border-surface-container-high rounded-xl shadow-lg overflow-hidden"
        >
          <a
            role="menuitem"
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-body text-on-surface hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">calendar_month</span>
            Google Calendar
          </a>
          <a
            role="menuitem"
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-body text-on-surface hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">calendar_month</span>
            Outlook
          </a>
          <a
            role="menuitem"
            href={icsUrl}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-body text-on-surface hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
            Apple Calendar / .ics
          </a>
        </div>
      )}
    </div>
  );
}
