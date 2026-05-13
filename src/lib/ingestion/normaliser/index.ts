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

/**
 * Strip HTML tags and normalise whitespace for descriptions.
 *
 * Several adapters (Oztix, Sticky Tickets, Eventbrite, future others) read
 * `description` straight out of JSON-LD or platform JSON, where it often
 * contains raw HTML (`<p>`, `<br>`, `<em>`, `<strong>`, image tags). The
 * frontend renders descriptions as plain text — by design, to avoid an XSS
 * surface — so any HTML that slips through is shown verbatim to the user.
 *
 * Block-level tags become newlines so list/paragraph formatting survives;
 * inline tags drop to their text content. HTML entities are decoded after
 * tag removal so escaped angle brackets in actual prose are preserved.
 */
function cleanDescription(raw: string): string {
  const blockBreak = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ");
  const stripped = blockBreak.replace(/<[^>]+>/g, "");
  return decodeHtmlEntities(stripped)
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanShortText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const out = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  return out.length ? out : null;
}

// Map any common spelling/case/truncation of an Australian state or territory
// to its canonical 3-letter code, or "Unknown" if we can't recognise it.
//
// Adapters draw from a mix of sources (schema.org `addressRegion`, Ticketmaster
// `stateCode`, Bandsintown `region`, Google Maps `short_name`, free-text address
// tails) so input shape varies wildly. Centralising here avoids per-adapter
// guesswork and the EVE-195 truncations (`QL`/`NS`/`VI`) that snuck in when a
// source returned `QLD`/`NSW`/`VIC` already sliced to 2 chars.
const STATE_LOOKUP: Record<string, string> = {
  // Canonical codes
  qld: "QLD", nsw: "NSW", vic: "VIC", wa: "WA",
  sa: "SA", tas: "TAS", nt: "NT", act: "ACT",
  // 2-letter truncations of the 3-letter codes
  ql: "QLD", ns: "NSW", vi: "VIC", ta: "TAS", ac: "ACT",
  // Full names
  queensland: "QLD",
  "new south wales": "NSW",
  victoria: "VIC",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "TAS",
  "northern territory": "NT",
  "australian capital territory": "ACT",
};

// Anything written to `Event.state` must be one of these. The runtime guard at
// the end of `deriveState` enforces this so a bad mapping can never slip into
// the DB (the `al`/`Casual` row class from EVE-220).
export const CANONICAL_STATES = ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"] as const;
const CANONICAL_STATE_SET: ReadonlySet<string> = new Set(CANONICAL_STATES);
const UNKNOWN_STATE = "Unknown";

export function normaliseState(raw: string | null | undefined): string {
  const cleaned = cleanShortText(raw);
  if (!cleaned) return UNKNOWN_STATE;
  // Strip ISO 3166-2 prefix ("AU-QLD" → "QLD") and trailing punctuation.
  const key = cleaned
    .toLowerCase()
    .replace(/^au[-_\s]/, "")
    .replace(/[.,]+$/, "")
    .trim();
  return STATE_LOOKUP[key] ?? UNKNOWN_STATE;
}

// Australian postcode → state ranges. Used as a fallback when the adapter's
// `state` field is missing/garbage but the venue address still carries a
// postcode — the most reliable signal for the meetup/megatix Unknown rows
// EVE-220 was filed against. Source: Australia Post.
function stateFromPostcode(text: string): string | null {
  const m = text.match(/\b(\d{4})\b/);
  if (!m) return null;
  const pc = parseInt(m[1], 10);
  if (pc >= 200 && pc <= 299) return "ACT";
  if (pc >= 800 && pc <= 999) return "NT";
  if (pc >= 1000 && pc <= 2599) return "NSW";
  if (pc >= 2600 && pc <= 2618) return "ACT";
  if (pc >= 2619 && pc <= 2899) return "NSW";
  if (pc >= 2900 && pc <= 2920) return "ACT";
  if (pc >= 2921 && pc <= 2999) return "NSW";
  if (pc >= 3000 && pc <= 3999) return "VIC";
  if (pc >= 4000 && pc <= 4999) return "QLD";
  if (pc >= 5000 && pc <= 5999) return "SA";
  if (pc >= 6000 && pc <= 6999) return "WA";
  if (pc >= 7000 && pc <= 7999) return "TAS";
  if (pc >= 8000 && pc <= 8999) return "VIC";
  if (pc >= 9000 && pc <= 9999) return "QLD";
  return null;
}

// Word-boundary match of any state code or full name embedded in free text —
// catches "Mermaid Waters, QLD" and "Robina Town Centre Drive, Robina, Qld 4230"
// shaped strings that adapters dump into city/venueAddress.
const STATE_TEXT_RE =
  /\b(qld|queensland|nsw|new south wales|vic|victoria|wa|western australia|sa|south australia|tas|tasmania|nt|northern territory|act|australian capital territory)\b/i;

function stateFromText(text: string): string | null {
  const m = text.match(STATE_TEXT_RE);
  if (!m) return null;
  return STATE_LOOKUP[m[1].toLowerCase()] ?? null;
}

// Capitals + the regional/suburb names that actually appear in the EVE-220
// Unknown sample. Keep this list small: gravity favours capitals, and
// ambiguous suburb names (Richmond exists in VIC/NSW/QLD/TAS) would mislabel
// rows. Anything not here falls back to Unknown rather than guessing.
const CITY_TO_STATE: ReadonlyMap<string, string> = new Map([
  // QLD
  ["gold coast", "QLD"], ["surfers paradise", "QLD"], ["brisbane", "QLD"],
  ["sunshine coast", "QLD"], ["cairns", "QLD"], ["townsville", "QLD"],
  ["toowoomba", "QLD"], ["coolangatta", "QLD"], ["broadbeach", "QLD"],
  ["burleigh heads", "QLD"], ["robina", "QLD"], ["mermaid beach", "QLD"],
  ["mermaid waters", "QLD"], ["mudgeeraba", "QLD"], ["carrara", "QLD"],
  ["main beach", "QLD"], ["varsity lakes", "QLD"], ["helensvale", "QLD"],
  ["coomera", "QLD"], ["beenleigh", "QLD"], ["redland bay", "QLD"],
  ["cleveland", "QLD"], ["fortitude valley", "QLD"], ["east brisbane", "QLD"],
  ["stafford heights", "QLD"], ["bli bli", "QLD"], ["woolloongabba", "QLD"],
  ["petrie terrace", "QLD"], ["spring hill", "QLD"], ["nambour", "QLD"],
  ["warana", "QLD"], ["west end", "QLD"],
  // NSW
  ["sydney", "NSW"], ["newcastle", "NSW"], ["wollongong", "NSW"],
  ["byron bay", "NSW"], ["north sydney", "NSW"], ["circular quay", "NSW"],
  ["panania", "NSW"], ["lansvale", "NSW"], ["riverstone", "NSW"],
  ["the rocks", "NSW"], ["forest lodge", "NSW"], ["chippendale", "NSW"],
  ["haymarket", "NSW"], ["pyrmont", "NSW"], ["merrylands", "NSW"],
  ["kingsford", "NSW"], ["crows nest", "NSW"], ["redfern", "NSW"],
  ["surry hills", "NSW"], ["north parramatta", "NSW"],
  // VIC
  ["melbourne", "VIC"], ["geelong", "VIC"], ["ballarat", "VIC"],
  ["north melbourne", "VIC"], ["fitzroy", "VIC"], ["ascot vale", "VIC"],
  ["caulfield east", "VIC"], ["docklands", "VIC"], ["carlton", "VIC"],
  ["st kilda", "VIC"], ["south melbourne", "VIC"], ["sandringham", "VIC"],
  ["coburg", "VIC"], ["point cook", "VIC"],
  // SA
  ["adelaide", "SA"], ["west lakes", "SA"],
  // WA
  ["perth", "WA"], ["fremantle", "WA"], ["leederville", "WA"],
  ["victoria park", "WA"], ["south perth", "WA"], ["bibra lake", "WA"],
  ["shenton park", "WA"], ["cloverdale", "WA"], ["rockingham", "WA"],
  // TAS
  ["hobart", "TAS"],
  // ACT
  ["canberra", "ACT"], ["fyshwick", "ACT"], ["dickson", "ACT"],
  ["mawson", "ACT"], ["greenway", "ACT"],
  // NT
  ["darwin", "NT"],
]);

// Precompiled regex matching any city in CITY_TO_STATE as a word-bounded token,
// longest-first so multi-word names ("Gold Coast", "Surfers Paradise") win
// over their prefixes. Lets venueName shapes like "VIVA Melbourne" and
// "Brisbane Hotel" resolve to their state.
const CITY_TOKEN_RE = new RegExp(
  `\\b(${[...CITY_TO_STATE.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})\\b`,
  "i",
);

function stateFromCity(text: string | null | undefined): string | null {
  const cleaned = cleanShortText(text);
  if (!cleaned) return null;
  // Embedded state code wins over city-name lookup so "Mermaid Waters, QLD"
  // resolves even when the suburb isn't in CITY_TO_STATE.
  const embedded = stateFromText(cleaned) ?? stateFromPostcode(cleaned);
  if (embedded) return embedded;
  // Whole-string + comma-segmented exact match (cheapest, exact).
  const whole = CITY_TO_STATE.get(cleaned.toLowerCase().trim());
  if (whole) return whole;
  for (const segment of cleaned.split(",")) {
    const hit = CITY_TO_STATE.get(segment.toLowerCase().trim());
    if (hit) return hit;
  }
  // Last resort: word-bounded city-token scan. Picks up venue names like
  // "VIVA Melbourne" / "Brisbane Hotel" that bury the city in free text.
  const tokenMatch = cleaned.match(CITY_TOKEN_RE);
  if (tokenMatch) return CITY_TO_STATE.get(tokenMatch[1].toLowerCase()) ?? null;
  return null;
}

// Derive the canonical state from whatever signals the adapter gave us. Tries
// the explicit `state` field first (cheapest and usually right), then mines
// the venue address for a postcode or state-name fragment, then falls back to
// a known-city lookup, then finally mines the venue name (megatix events
// frequently carry only `venueName` like "VIVA Melbourne" or
// "The Whitsundays, QLD" with no other location data). The final value is
// asserted to live in the canonical set or "Unknown" — the EVE-220 runtime
// guard that ensures no other shape can be written to `Event.state`.
export function deriveState(input: {
  state?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  venueName?: string | null;
}): string {
  let result = normaliseState(input.state);
  if (result === UNKNOWN_STATE && input.venueAddress) {
    result =
      stateFromPostcode(input.venueAddress) ??
      stateFromText(input.venueAddress) ??
      UNKNOWN_STATE;
  }
  if (result === UNKNOWN_STATE) {
    result = stateFromCity(input.city) ?? UNKNOWN_STATE;
  }
  if (result === UNKNOWN_STATE) {
    result = stateFromCity(input.venueName) ?? UNKNOWN_STATE;
  }
  if (result !== UNKNOWN_STATE && !CANONICAL_STATE_SET.has(result)) {
    // Defensive — every lookup above maps into the canonical set, so this can
    // only fire if a typo creeps into STATE_LOOKUP / CITY_TO_STATE.
    return UNKNOWN_STATE;
  }
  return result;
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
//
// The suffix must be unique enough to make the resulting slug unique across
// the entire `Event` table (slug has a global UNIQUE constraint). Truncating
// too aggressively caused P2002 collisions on Ticketmaster (EVE-184), whose
// IDs are 15-16 char random tokens that share leading prefixes —
// `1AefZbMGkVeq10i` and `1AefZbMGkVeq11x` both became `1aefzbmgkveq`.
export function suffixFromSourceId(sourceId: string): string {
  const segments = sourceId.split(/[^a-z0-9]+/i).filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  if (last && !/^https?$/i.test(last)) {
    return last.slice(0, 32).toLowerCase();
  }
  return sourceId
    .replace(/[^a-z0-9]/gi, "")
    .replace(/^https?/i, "")
    .slice(0, 32)
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
    state: deriveState({
      state: raw.state,
      city: raw.city,
      venueAddress: raw.venueAddress,
      venueName: raw.venueName,
    }),
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
