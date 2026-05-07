"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Tracks whether any element marked `[data-primary-search]` is currently
 * intersecting the viewport. Used by the header search components to hide
 * themselves when a page-level search input (hero, /events filters) is visible
 * and would otherwise be a duplicate UI (EVE-169).
 */
export function usePrimarySearchVisible(): boolean {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const visibleSet = new Set<Element>();
    const observed = new Set<Element>();

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleSet.add(entry.target);
          else visibleSet.delete(entry.target);
        }
        setVisible(visibleSet.size > 0);
      },
      { threshold: 0 }
    );

    const scan = () => {
      // Drop any tracked elements that have been removed from the DOM.
      observed.forEach((el) => {
        if (!document.contains(el)) {
          intersectionObserver.unobserve(el);
          observed.delete(el);
          visibleSet.delete(el);
        }
      });
      document.querySelectorAll<HTMLElement>("[data-primary-search]").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          intersectionObserver.observe(el);
        }
      });
      setVisible(visibleSet.size > 0);
    };

    scan();
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return visible;
}
