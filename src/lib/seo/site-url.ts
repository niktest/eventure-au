const STAGING_FALLBACK = "https://eventure-au.vercel.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const trimmed = raw?.trim();
  const candidate = trimmed && trimmed.length > 0 ? trimmed : STAGING_FALLBACK;
  return candidate.replace(/\/+$/, "");
}
