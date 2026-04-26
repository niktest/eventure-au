"use client";

import { useEffect, useRef, useState } from "react";

export interface OverflowAction {
  label: string;
  icon: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export function OverflowMenu({
  actions,
  ariaLabel,
}: {
  actions: OverflowAction[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-secondary hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          more_vert
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg z-30 py-1"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className={
                "w-full text-left flex items-center gap-2 px-3 py-2 font-body text-sm transition-colors disabled:opacity-50 " +
                (action.tone === "danger"
                  ? "text-error hover:bg-error/10"
                  : "text-on-surface hover:bg-surface-container-low")
              }
            >
              <span
                className="material-symbols-outlined text-[18px]"
                aria-hidden="true"
              >
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
