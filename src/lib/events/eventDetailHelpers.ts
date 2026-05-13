// Pull an age-suitability hint from free-form tags. We don't store this as a
// first-class column, but ingestion adapters often tag events with strings
// like "18+" or "All ages". Surfacing them in the page hierarchy is cheap and
// reduces support questions on parent-facing event pages.
export function ageSuitabilityFromTags(tags: string[] | null | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (/^\d{1,2}\+$/.test(tag)) return tag.toUpperCase();
    if (tag === "18+" || tag === "21+") return tag.toUpperCase();
    if (tag.includes("all age")) return "All ages";
    if (tag.includes("family") && tag.includes("friend")) return "Family friendly";
    if (tag.includes("kid friendly") || tag === "kids") return "Kid friendly";
    if (tag.includes("over 18") || tag.includes("adults only")) return "18+";
  }
  return null;
}

import { eventSourceMeta } from "./eventSources";

export function sourceAttribution(source: string | null | undefined): string | null {
  return eventSourceMeta(source)?.label ?? null;
}
