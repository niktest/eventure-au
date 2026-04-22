const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  MUSIC: { icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z", color: "text-primary-container", bg: "bg-primary-container/10" },
  FESTIVAL: { icon: "M5 3l3.057-3L12 3.5 15.943 0 19 3v2.5l2 2.5H3l2-2.5V3zm-2 7h18v2H3v-2zm2 4h14l-1 7H6l-1-7z", color: "text-primary", bg: "bg-primary/10" },
  MARKETS: { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z", color: "text-tertiary", bg: "bg-tertiary/10" },
  SPORTS: { icon: "M14.828 14.828a4 4 0 01-5.656 0M9.172 9.172a4 4 0 015.656 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-success", bg: "bg-success/10" },
  FAMILY: { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", color: "text-tertiary", bg: "bg-tertiary/10" },
  NIGHTLIFE: { icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z", color: "text-secondary", bg: "bg-secondary/10" },
  FOOD_DRINK: { icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z", color: "text-primary-container", bg: "bg-primary-container/10" },
  ARTS: { icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01", color: "text-tertiary", bg: "bg-tertiary/10" },
  COMEDY: { icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-primary", bg: "bg-primary/10" },
  THEATRE: { icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z", color: "text-primary", bg: "bg-primary/10" },
  OUTDOOR: { icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-success", bg: "bg-success/10" },
  COMMUNITY: { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "text-tertiary", bg: "bg-tertiary/10" },
};

const DEFAULT_ICON = { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-secondary", bg: "bg-surface-container-low" };

export function CategoryIcon({ category, size = "sm" }: { category: string; size?: "sm" | "md" }) {
  const { icon, color, bg } = CATEGORY_ICONS[category] ?? DEFAULT_ICON;
  const sizeClass = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  const padClass = size === "md" ? "p-2" : "p-1";

  return (
    <span className={`inline-flex items-center justify-center rounded-full ${bg} ${padClass}`}>
      <svg className={`${sizeClass} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </span>
  );
}
