"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "eventure_interested_events";

function getInterested(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setInterested(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function InterestedButton({ eventId }: { eventId: string }) {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActive(getInterested().includes(eventId));
    setMounted(true);
  }, [eventId]);

  const toggle = () => {
    const current = getInterested();
    const next = active
      ? current.filter((id) => id !== eventId)
      : [...current, eventId];
    setInterested(next);
    setActive(!active);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={`w-full rounded-full py-4 font-heading text-lg font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
        active
          ? "bg-primary text-on-primary hover:shadow-lg hover:-translate-y-1"
          : "bg-primary-container text-on-primary hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px] transition-transform duration-200"
        style={{
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
          transform: mounted && active ? "scale(1.15)" : "scale(1)",
        }}
      >
        star
      </span>
      {active ? "Interested!" : "Interested"}
    </button>
  );
}
