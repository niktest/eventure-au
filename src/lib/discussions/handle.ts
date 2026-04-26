/**
 * Author handle is purely derived — no `handle` column on User.
 * Rule from spec §9: lowercase name, spaces → "_", strip non-alphanumerics
 * (keeping underscores), max 24 chars. Fall back to email local-part.
 */
export function deriveHandle(args: {
  name: string | null | undefined;
  email: string | null | undefined;
}): string {
  const name = (args.name ?? "").trim();
  if (name.length > 0) {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 24);
    if (slug.length > 0) return slug;
  }
  const email = (args.email ?? "").toLowerCase();
  const local = email.split("@")[0] ?? "";
  const slug = local
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  return slug.length > 0 ? slug : "user";
}
