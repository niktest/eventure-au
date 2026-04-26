import Link from "next/link";

export function CommunityRulesCard() {
  return (
    <aside className="bg-surface-container border border-outline-variant/40 rounded-xl p-5">
      <h2 className="font-heading text-base font-bold text-on-surface mb-3">
        Be a good neighbour
      </h2>
      <ul className="space-y-2 font-body text-sm text-on-surface-variant">
        <li className="flex gap-2">
          <span className="text-primary" aria-hidden="true">·</span>
          <span>Be kind — assume the best.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary" aria-hidden="true">·</span>
          <span>No spam, no self-promo, no ticket touts.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary" aria-hidden="true">·</span>
          <span>Stay on topic — this is for events, not politics.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary" aria-hidden="true">·</span>
          <span>Flag, don&apos;t fight. Use the report button.</span>
        </li>
      </ul>
      <Link
        href="/community#guidelines"
        className="mt-4 inline-flex items-center gap-1 font-body text-sm font-semibold text-primary hover:underline"
      >
        Read full guidelines
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          arrow_forward
        </span>
      </Link>
    </aside>
  );
}
