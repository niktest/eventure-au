import Link from "next/link";
import { HOMEPAGE_CATEGORIES, categoryHref } from "@/lib/categories";

type HomepageCategoryRowProps = {
  /** Currently active slug, used by category landing pages. Leave undefined on the homepage. */
  active?: string;
};

/**
 * Homepage category chip row per EVE-126 §4.2.
 * Server-rendered <a> links so chips are SEO-indexable. The 11 labels and
 * order are authoritative and live in {@link HOMEPAGE_CATEGORIES}.
 */
export function HomepageCategoryRow({ active }: HomepageCategoryRowProps) {
  return (
    <nav
      aria-label="Browse events by category"
      className="-mx-1 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 md:gap-2.5 lg:flex-wrap lg:overflow-visible"
    >
      {HOMEPAGE_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = active === cat.slug;
        const ringColor = cat.magentaAccent
          ? "border-neon-magenta shadow-glow-magenta"
          : "border-neon-coral shadow-glow-coral";
        const stateClasses = isActive
          ? `bg-surface-2 ${ringColor} text-on-dark-strong`
          : "bg-surface-1 border-surface-3 text-on-dark-muted hover:bg-surface-2 hover:text-on-dark-strong hover:border-neon-coral/40";
        return (
          <Link
            key={cat.slug}
            href={categoryHref(cat.slug)}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-body text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-coral-glow whitespace-nowrap ${stateClasses}`}
          >
            <Icon size={18} aria-hidden="true" className="shrink-0" />
            <span>{cat.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
