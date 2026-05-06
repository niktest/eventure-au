import type { RawEvent, NormalisedEvent, EventCategory } from "@/types/event";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(text: string): string {
  // Run twice so double-encoded sources (e.g. `&amp;#39;`) collapse fully.
  const decode = (s: string) =>
    s
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
  return decode(decode(text));
}

export function cleanTitle(raw: string): string {
  return decodeHtmlEntities(raw)
    // Strip URLs that have leaked into source titles
    .replace(/\bhttps?:\/\/\S+/gi, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(raw: string): string {
  return decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
}

function cleanShortText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const out = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  return out.length ? out : null;
}

function slugify(text: string): string {
  return cleanTitle(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

// Pull a stable, meaningful disambiguator out of a sourceId. URL-shaped
// sourceIds like `https://www.moshtix.com.au/v2/event/foo/149068` would
// otherwise serialise to `https` (the leading 8 chars), which is what
// produced the `-https` slug residue cleaned up in EVE-155.
export function suffixFromSourceId(sourceId: string): string {
  const segments = sourceId.split(/[^a-z0-9]+/i).filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  if (last && !/^https?$/i.test(last)) {
    return last.slice(0, 12).toLowerCase();
  }
  return sourceId
    .replace(/[^a-z0-9]/gi, "")
    .replace(/^https?/i, "")
    .slice(0, 8)
    .toLowerCase();
}

function makeUniqueSlug(name: string, sourceId: string): string {
  const base = slugify(name);
  const suffix = suffixFromSourceId(sourceId);
  return base ? `${base}-${suffix}` : suffix;
}

function normaliseImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // next.config.ts only whitelists https remote images; upgrade so the
  // Next.js Image optimiser doesn't reject Moshtix-style http source URLs.
  return url.replace(/^http:\/\//i, "https://");
}

function parseDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function inferCategory(raw: RawEvent): EventCategory {
  if (raw.category) return raw.category;
  const text = `${raw.name} ${raw.description ?? ""} ${(raw.tags ?? []).join(" ")}`.toLowerCase();
  if (/\bmusic\b|\bconcert\b|\blive band\b|\bgig\b/.test(text)) return "MUSIC";
  if (/\bfestival\b/.test(text)) return "FESTIVAL";
  if (/\bmarket\b|\bfarmers?\b/.test(text)) return "MARKETS";
  if (/\bsport\b|\bfooty\b|\bcricket\b|\bsurf\b|\brun\b|\bmarathon\b/.test(text)) return "SPORTS";
  if (/\bkids?\b|\bfamily\b|\bchildren\b/.test(text)) return "FAMILY";
  if (/\bnightlife\b|\bclub\b|\bdj\b|\bdance party\b/.test(text)) return "NIGHTLIFE";
  if (/\bfood\b|\bdrink\b|\bwine\b|\bbeer\b|\bdining\b/.test(text)) return "FOOD_DRINK";
  if (/\bart\b|\bgallery\b|\bexhibition\b/.test(text)) return "ARTS";
  if (/\bcomedy\b|\bstand.up\b/.test(text)) return "COMEDY";
  if (/\btheatre\b|\btheater\b|\bplay\b|\bmusical\b/.test(text)) return "THEATRE";
  if (/\boutdoor\b|\bhike\b|\bnature\b/.test(text)) return "OUTDOOR";
  if (/\bcommunity\b|\bcharity\b|\bvolunteer\b/.test(text)) return "COMMUNITY";
  return "OTHER";
}

export function normalise(source: string, raw: RawEvent): NormalisedEvent {
  const startDate = parseDate(raw.startDate);
  const endDate = raw.endDate ? parseDate(raw.endDate) : null;

  const cleanedName = cleanTitle(raw.name);

  return {
    slug: makeUniqueSlug(cleanedName, raw.sourceId),
    name: cleanedName,
    description: raw.description ? cleanDescription(raw.description) : null,
    startDate,
    endDate,
    imageUrl: normaliseImageUrl(raw.imageUrl),
    url: raw.url ?? null,
    venueName: cleanShortText(raw.venueName),
    venueAddress: cleanShortText(raw.venueAddress),
    city: cleanShortText(raw.city) ?? "Unknown",
    state: cleanShortText(raw.state) ?? "Unknown",
    country: "AU",
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    category: inferCategory(raw),
    tags: raw.tags ?? [],
    isFree: raw.isFree ?? false,
    priceMin: raw.priceMin ?? null,
    priceMax: raw.priceMax ?? null,
    currency: "AUD",
    ticketUrl: raw.ticketUrl ?? null,
    ticketProvider: raw.ticketProvider ?? null,
    ticketAvailability: raw.ticketAvailability ?? null,
    priceTiers: raw.priceTiers as import("@prisma/client").Prisma.InputJsonValue ?? null,
    affiliateEligible: raw.affiliateEligible ?? false,
    affiliateUrl: null,
    source,
    sourceId: raw.sourceId,
    sourceUrl: raw.url ?? null,
    rawData: (raw.rawData as import("@prisma/client").Prisma.InputJsonValue) ?? null,
    status: "published",
  };
}
