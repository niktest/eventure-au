const SITE_URL_FALLBACK = "https://festlio.com";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const trimmed = raw?.trim();
  const candidate = trimmed && trimmed.length > 0 ? trimmed : SITE_URL_FALLBACK;
  return candidate.replace(/\/+$/, "");
}
