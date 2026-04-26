"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error";

interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: (m) => console.info("[toast]", m) };
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={
              "pointer-events-auto rounded-lg border px-4 py-3 shadow-lg font-body text-sm font-semibold animate-fade-in " +
              (item.tone === "error"
                ? "bg-error/10 text-error border-error/30"
                : "bg-success/10 text-success border-success/30")
            }
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
