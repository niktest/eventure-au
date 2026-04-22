"use client";

import { useState, useId } from "react";

interface AccordionItem {
  question: string;
  answer: React.ReactNode;
}

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

const Heading = ({
  level,
  children,
  ...props
}: {
  level: HeadingLevel;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>) => {
  const Tag = `h${level}` as const;
  return <Tag {...props}>{children}</Tag>;
};

export function Accordion({
  items,
  headingLevel = 3,
}: {
  items: AccordionItem[];
  headingLevel?: HeadingLevel;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className="divide-y divide-surface-container-high rounded-xl border border-surface-container-high">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const headingId = `${baseId}-heading-${index}`;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={index}>
            <Heading level={headingLevel} className="m-0">
              <button
                id={headingId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="font-heading font-bold text-on-surface">
                  {item.question}
                </span>
                <span
                  className={`material-symbols-outlined ml-4 shrink-0 text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              hidden={!isOpen}
              className="px-6 pb-4 font-body text-on-surface-variant leading-relaxed"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
