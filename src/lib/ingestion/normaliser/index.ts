import type { RawEvent, NormalisedEvent, EventCategory } from "@/types/event";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function makeUniqueSlug(name: string, sourceId: string): string {
  const base = slugify(name);
  const suffix = sourceId.slice(0, 8).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${base}-${suffix}`;
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

  return {
    slug: makeUniqueSlug(raw.name, raw.sourceId),
    name: raw.name.trim(),
    description: raw.description?.trim() ?? null,
    startDate,
    endDate,
    imageUrl: raw.imageUrl ?? null,
    url: raw.url ?? null,
    venueName: raw.venueName ?? null,
    venueAddress: raw.venueAddress ?? null,
    city: raw.city ?? "Unknown",
    state: raw.state ?? "Unknown",
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
