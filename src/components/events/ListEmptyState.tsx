import Link from "next/link";
import type { ZeroResultSuggestion } from "@/lib/events/zeroResultSuggestions";

type Props = {
  headline: string;
  body?: string;
  icon?: string;
  suggestions: ZeroResultSuggestion[];
  /** Test hook for E2E selectors. */
  testId?: string;
};

/**
 * Shared zero-result panel for list views (EVE-213). Always renders at
 * least one clickable suggestion; styles the first action as the primary
 * call-to-action and the rest as pill secondaries.
 */
export function ListEmptyState({
  headline,
  body,
  icon = "explore_off",
  suggestions,
  testId,
}: Props) {
  const [primary, ...rest] = suggestions;
  return (
    <div
      data-testid={testId}
      className="rounded-xl bg-surface-container-low py-16 px-6 text-center"
    >
      <span
        className="material-symbols-outlined text-4xl text-secondary mb-4 block"
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="text-on-surface font-body text-lg font-semibold">
        {headline}
      </p>
      {body ? (
        <p className="mt-2 text-sm text-outline font-body">{body}</p>
      ) : null}
      {primary ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            key={primary.key}
            href={primary.href}
            data-suggestion={primary.key}
            className="rounded-full bg-primary px-5 py-2 font-body text-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
          >
            {primary.label}
          </Link>
          {rest.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              data-suggestion={s.key}
              className="rounded-full bg-surface-container px-5 py-2 font-body text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
