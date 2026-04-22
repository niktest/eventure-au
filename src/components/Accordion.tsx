"use client";

import { useState } from "react";

interface AccordionItem {
  question: string;
  answer: React.ReactNode;
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-surface-container-high rounded-xl border border-surface-container-high">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-container-low"
              aria-expanded={isOpen}
            >
              <span className="font-heading font-bold text-on-surface">
                {item.question}
              </span>
              <span
                className={`material-symbols-outlined ml-4 shrink-0 text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                expand_more
              </span>
            </button>
            {isOpen && (
              <div className="px-6 pb-4 font-body text-on-surface-variant leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
