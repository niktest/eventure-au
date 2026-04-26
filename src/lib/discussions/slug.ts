/**
 * Slug shape from spec §2: `kebab-of-title-shortid`.
 * Short id keeps the URL collision-resistant without requiring db lookups.
 */
const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";

export function shortId(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  }
  return out;
}

export function buildThreadSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const safeBase = base.length > 0 ? base : "thread";
  return `${safeBase}-${shortId()}`;
}
