import Link from "next/link";
import {
  HOMEPAGE_CATEGORIES,
  allCategoriesHref,
  categoryHref,
  categoryToggleHref,
  type PreserveParams,
} from "@/lib/categories";

type HomepageCategoryRowProps = {
  /**
   * Currently active slug(s).
   * - Single-select (homepage, /city): pass a single slug or undefined.
   * - Multi-select (/events per EVE-230): pass an array of slugs and set
   *   `multi` so chip clicks toggle membership instead of replacing.
   */
  active?: string | readonly string[];
  /**
   * URL params to carry through chip clicks (date, q, dateFrom, dateTo, …).
   * Chip-axis params (category, price, free) are always replaced. EVE-229.
   */
  preserve?: PreserveParams;
  /** Prepend an "All" pseudo-chip that clears the chip axis. Off on Home. */
  showAllChip?: boolean;
  /**
   * EVE-230: chip clicks toggle slug membership in `?category=foo,bar` rather
   * than replacing the chip-axis. Free still toggles `?price=free` independently.
   */
  multi?: boolean;
  /** EVE-230: when `multi` is on, mark the Free chip active via ?price=free. */
  freeActive?: boolean;
};

/**
 * Homepage category chip row — 12 chips per EVE-215. Also reused on /events
 * as the single canonical chip row (EVE-229) so Browse and Home present the
 * same taxonomy and active state.
 *
 * Server-rendered <a> links so chips are SEO-indexable. Labels, order, and
 * slugs are authoritative and live in {@link HOMEPAGE_CATEGORIES}.
 */
export function HomepageCategoryRow({
  active,
  preserve,
  showAllChip,
  multi,
  freeActive,
}: HomepageCategoryRowProps) {
  const activeSlugs: readonly string[] = Array.isArray(active)
    ? (active as readonly string[])
    : active
      ? [active as string]
      : [];
  const activeSet = new Set(activeSlugs);
  const noneActive = activeSlugs.length === 0 && !freeActive;

  const chipClass = (isActive: boolean) =>
    `shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 min-h-[44px] font-body text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow whitespace-nowrap ${
      isActive
        ? "bg-surface-2 border-neon-coral shadow-glow-coral text-on-dark-strong"
        : "bg-surface-1 border-surface-3 text-on-dark-muted hover:bg-surface-2 hover:text-on-dark-strong hover:border-neon-coral/40"
    }`;

  const hrefFor = (slug: string): string =>
    multi
      ? categoryToggleHref(slug, activeSlugs, preserve, { freeActive })
      : categoryHref(slug, preserve);

  return (
    <nav
      aria-label="Browse events by category"
      className="-mx-1 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 md:gap-2.5 lg:flex-wrap lg:overflow-visible"
    >
      {showAllChip && (
        <Link
          href={allCategoriesHref(preserve)}
          aria-current={noneActive ? "page" : undefined}
          className={chipClass(noneActive)}
        >
          <span>All</span>
        </Link>
      )}
      {HOMEPAGE_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive =
          cat.slug === "free" ? !!freeActive : activeSet.has(cat.slug);
        return (
          <Link
            key={cat.slug}
            href={hrefFor(cat.slug)}
            aria-current={isActive ? "page" : undefined}
            aria-pressed={multi ? isActive : undefined}
            className={chipClass(isActive)}
          >
            <Icon size={18} aria-hidden="true" className="shrink-0" />
            <span>{cat.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
