import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalisedEvent } from "@/types/event";

/**
 * Time window for considering two events the "same" occurrence.
 * Widened from ±4h to ±12h because many Ticketmaster↔Moshtix listings of the
 * same gig are stored 10h apart due to timezone-handling differences in the
 * upstream feeds. ±12h still keeps multi-day festivals out of one bucket.
 */
const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const COORDS_RADIUS_KM = 10;
const STRONG_SIM = 0.85;
const VENUE_SIM = 0.78;

// Vercel runs ingestion in syd1 but Neon lives in us-east-1, so each query
// pays ~200ms RTT. With ~3500 TM events doing two sequential queries each, the
// 300s function cap is hit before the loop finishes. Bounded concurrency keeps
// us inside Neon's pgBouncer pool while amortising the latency.
const UPSERT_CONCURRENCY = 64;

interface DedupCandidate {
  id: string;
  name: string;
  venueName: string | null;
  source: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  startDate: Date;
  createdAt: Date;
}

/**
 * Upsert events into the database, deduplicating by (source, sourceId).
 * Cross-source fuzzy matching runs on a single pre-fetched candidate set
 * (one query per call) instead of one query per new event — see EVE-194.
 */
export async function upsertEvents(
  events: NormalisedEvent[]
): Promise<{ created: number; updated: number; errors: number; dupsLinked: number }> {
  if (events.length === 0) {
    return { created: 0, updated: 0, errors: 0, dupsLinked: 0 };
  }

  // All events in a call originate from a single adapter, so they share `source`.
  const source = events[0].source;
  const candidatesByStateDay = await preloadDedupCandidates(source, events);

  let created = 0;
  let updated = 0;
  let errors = 0;
  let dupsLinked = 0;

  const processOne = async (event: NormalisedEvent): Promise<void> => {
    try {
      const result = await prisma.event.upsert({
        where: {
          source_sourceId: { source: event.source, sourceId: event.sourceId },
        },
        update: {
          name: event.name,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          imageUrl: event.imageUrl,
          url: event.url,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          city: event.city,
          state: event.state,
          latitude: event.latitude,
          longitude: event.longitude,
          category: event.category,
          tags: event.tags,
          isFree: event.isFree,
          priceMin: event.priceMin,
          priceMax: event.priceMax,
          ticketUrl: event.ticketUrl,
          ticketProvider: event.ticketProvider,
          ticketAvailability: event.ticketAvailability,
          priceTiers: event.priceTiers ?? undefined,
          affiliateEligible: event.affiliateEligible,
          sourceUrl: event.sourceUrl,
          rawData: event.rawData ?? undefined,
          lastScrapedAt: new Date(),
        },
        create: {
          ...event,
          rawData: event.rawData ?? Prisma.JsonNull,
          priceTiers: event.priceTiers ?? Prisma.JsonNull,
        },
        select: { id: true, createdAt: true, updatedAt: true },
      });

      // Treat the row as new when this call inserted it (createdAt === updatedAt).
      const wasCreated =
        result.createdAt.getTime() === result.updatedAt.getTime();

      if (wasCreated) {
        created++;
        if (matchAgainstCandidates(event, candidatesByStateDay)) {
          await prisma.event.update({
            where: { id: result.id },
            data: { status: "draft" },
          });
          dupsLinked++;
        }
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`[dedup] Failed to upsert event "${event.name}":`, err);
      errors++;
    }
  };

  for (let i = 0; i < events.length; i += UPSERT_CONCURRENCY) {
    const chunk = events.slice(i, i + UPSERT_CONCURRENCY);
    await Promise.all(chunk.map(processOne));
  }

  return { created, updated, errors, dupsLinked };
}

/**
 * Pre-fetch all events from OTHER sources that could possibly match any
 * incoming event, indexed by (state, dayBucket). City-equality is *not*
 * used as a filter (it misses suburb-vs-metro pairs e.g. Miami vs Gold
 * Coast) — we filter by state and check location at match-time.
 */
async function preloadDedupCandidates(
  source: string,
  events: NormalisedEvent[]
): Promise<Map<string, DedupCandidate[]>> {
  const states = new Set<string>();
  let minTime = Number.POSITIVE_INFINITY;
  let maxTime = Number.NEGATIVE_INFINITY;

  for (const e of events) {
    if (e.state) states.add(e.state);
    const t = e.startDate.getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }

  if (states.size === 0 || !Number.isFinite(minTime)) {
    return new Map();
  }

  const candidates = await prisma.event.findMany({
    where: {
      source: { not: source },
      state: { in: [...states] },
      startDate: {
        gte: new Date(minTime - DEDUP_WINDOW_MS),
        lte: new Date(maxTime + DEDUP_WINDOW_MS),
      },
    },
    select: {
      id: true,
      name: true,
      venueName: true,
      source: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      startDate: true,
      createdAt: true,
    },
  });

  const byStateDay = new Map<string, DedupCandidate[]>();
  for (const c of candidates) {
    const key = stateDayKey(c.state, c.startDate);
    const list = byStateDay.get(key);
    if (list) list.push(c);
    else byStateDay.set(key, [c]);
  }
  return byStateDay;
}

/**
 * Cross-source fuzzy match against the pre-loaded candidate index.
 * Returns true if the incoming event should be marked as a duplicate.
 */
function matchAgainstCandidates(
  event: NormalisedEvent,
  candidatesByStateDay: Map<string, DedupCandidate[]>
): boolean {
  if (!event.state) return false;

  const startTime = event.startDate.getTime();
  const lo = startTime - DEDUP_WINDOW_MS;
  const hi = startTime + DEDUP_WINDOW_MS;
  const day = Math.floor(startTime / ONE_DAY_MS);
  const candidates: DedupCandidate[] = [];
  for (const off of [-1, 0, 1]) {
    const list = candidatesByStateDay.get(`${event.state}|${day + off}`);
    if (list) candidates.push(...list);
  }
  if (candidates.length === 0) return false;

  const eventNameNormalised = normaliseForMatch(event.name);
  if (eventNameNormalised.length < 4) return false;
  const eventVenueNormalised = event.venueName ? normaliseForMatch(event.venueName) : null;

  for (const candidate of candidates) {
    const ct = candidate.startDate.getTime();
    if (ct < lo || ct > hi) continue;

    const similarity = nameSimilarity(eventNameNormalised, normaliseForMatch(candidate.name));
    if (similarity < VENUE_SIM) continue;

    const candidateVenueNormalised = candidate.venueName ? normaliseForMatch(candidate.venueName) : null;
    const cityMatch = !!event.city && !!candidate.city && event.city === candidate.city;
    const venueMatch =
      eventVenueNormalised !== null &&
      candidateVenueNormalised !== null &&
      eventVenueNormalised === candidateVenueNormalised;
    const coordsMatch = withinRadius(event, candidate, COORDS_RADIUS_KM);

    const accept =
      (similarity >= STRONG_SIM && (cityMatch || venueMatch || coordsMatch)) ||
      (similarity >= VENUE_SIM && venueMatch);

    if (accept) {
      console.log(
        `[dedup] Cross-source match: "${event.name}" (${event.source}) ↔ "${candidate.name}" (${candidate.source}) — ${(similarity * 100).toFixed(0)}% similar`
      );
      return true;
    }
  }
  return false;
}

/**
 * Re-run cross-source dedup over the entire catalogue (or a horizon window)
 * and mark the later-created event in each duplicate group as draft.
 *
 * Used to backfill after dedup rule changes — see EVE-196.
 */
export async function findAndLinkDuplicates(opts: {
  /** Only consider events with startDate ≥ now (default true) */
  upcomingOnly?: boolean;
  /** Dry-run — return what *would* be marked without writing */
  dryRun?: boolean;
} = {}): Promise<{ scanned: number; marked: number; samples: Array<{ keptId: string; draftId: string; name: string }> }> {
  const { upcomingOnly = true, dryRun = false } = opts;

  const events = await prisma.event.findMany({
    where: upcomingOnly ? { startDate: { gte: new Date() } } : {},
    select: {
      id: true,
      name: true,
      venueName: true,
      source: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      startDate: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Bucket by (state, dayBucket) for O(N) matching.
  const byStateDay = new Map<string, typeof events>();
  for (const e of events) {
    if (!e.state) continue;
    const key = stateDayKey(e.state, e.startDate);
    const list = byStateDay.get(key);
    if (list) list.push(e);
    else byStateDay.set(key, [e]);
  }

  // Union-find so groups of 3+ matching events collapse cleanly.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p === x) return x;
    p = find(p);
    parent.set(x, p);
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const e of events) {
    if (!e.state) continue;
    const day = Math.floor(e.startDate.getTime() / ONE_DAY_MS);
    const eN = normaliseForMatch(e.name);
    if (eN.length < 4) continue;
    const eVenue = e.venueName ? normaliseForMatch(e.venueName) : null;
    for (const off of [-1, 0, 1]) {
      const peers = byStateDay.get(`${e.state}|${day + off}`);
      if (!peers) continue;
      for (const c of peers) {
        if (c.id === e.id || c.source === e.source) continue;
        const dt = Math.abs(c.startDate.getTime() - e.startDate.getTime());
        if (dt > DEDUP_WINDOW_MS) continue;
        const sim = nameSimilarity(eN, normaliseForMatch(c.name));
        if (sim < VENUE_SIM) continue;
        const cVenue = c.venueName ? normaliseForMatch(c.venueName) : null;
        const cityMatch = !!e.city && !!c.city && e.city === c.city;
        const venueMatch = !!eVenue && !!cVenue && eVenue === cVenue;
        const coordsMatch = withinRadius(e, c, COORDS_RADIUS_KM);
        const accept =
          (sim >= STRONG_SIM && (cityMatch || venueMatch || coordsMatch)) ||
          (sim >= VENUE_SIM && venueMatch);
        if (accept) union(e.id, c.id);
      }
    }
  }

  // For each duplicate group (size ≥ 2), keep the earliest-created event,
  // mark the others as draft.
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const r = parent.has(e.id) ? find(e.id) : e.id;
    const list = groups.get(r);
    if (list) list.push(e);
    else groups.set(r, [e]);
  }

  const toMark: string[] = [];
  const samples: Array<{ keptId: string; draftId: string; name: string }> = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const kept = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i];
      if (dup.status !== "draft") toMark.push(dup.id);
      if (samples.length < 20) samples.push({ keptId: kept.id, draftId: dup.id, name: dup.name });
    }
  }

  if (!dryRun && toMark.length > 0) {
    // Chunk to avoid oversize IN-clauses
    const chunkSize = 500;
    for (let i = 0; i < toMark.length; i += chunkSize) {
      const chunk = toMark.slice(i, i + chunkSize);
      await prisma.event.updateMany({
        where: { id: { in: chunk } },
        data: { status: "draft" },
      });
    }
  }

  return { scanned: events.length, marked: toMark.length, samples };
}

function stateDayKey(state: string | null, t: Date): string {
  const day = Math.floor(t.getTime() / ONE_DAY_MS);
  return `${state ?? "?"}|${day}`;
}

function withinRadius(
  a: { latitude: number | null; longitude: number | null },
  b: { latitude: number | null; longitude: number | null },
  km: number
): boolean {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return false;
  }
  const dLat = (a.latitude - b.latitude) * 111;
  const dLon =
    (a.longitude - b.longitude) *
    111 *
    Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon) <= km;
}

// ─── Pure helpers (exported for tests) ────────────────────────────────────

const EMOJI_RE = /\p{Extended_Pictographic}|\p{Emoji_Component}/gu;
const PREFIX_RE = /^(comedy|music|festival|family|arts?|sports?|theatre|nightlife|food|drink|markets?|community)\s*[:\-–|]\s*/i;
const VENUE_SUFFIX_RE = /\s*[-–|]?\s*(live\s+at|at|@)\s+[a-z0-9 ,'.&]+$/i;
const TRAIL_LOC_RE = /\s*[-–|]\s*(gold coast|brisbane|sydney|melbourne|perth|adelaide|hobart|darwin|canberra|byron bay|tweed heads|sunshine coast|tweed)\s*$/i;
const COUNTRY_TAG_RE = /\s*\((australia|estonian?|us|usa|uk|spain|canada|french|ind|aus|nz)\)\s*$/i;
const QUOTES_DASHES_RE = /["'`«»‘’“”]/g;
const STOPWORDS_RE = /\b(the|a|an|at|in|on|and)\b/g;

/**
 * Strip noise for matching. Removes emoji, leading category prefixes
 * ("COMEDY:", "MUSIC –"), trailing country tags ("(Spain)", "(USA)"),
 * trailing locations ("- Gold Coast"), and quotes/punctuation before
 * dropping stopwords.
 */
export function normaliseForMatch(s: string): string {
  let t = s.replace(EMOJI_RE, " ").replace(QUOTES_DASHES_RE, "").replace(/\|/g, "-").toLowerCase();
  // Strip prefixes/suffixes iteratively until stable.
  for (let i = 0; i < 3; i++) {
    const before = t;
    t = t
      .replace(PREFIX_RE, "")
      .replace(COUNTRY_TAG_RE, "")
      .replace(TRAIL_LOC_RE, "")
      .replace(VENUE_SUFFIX_RE, "");
    if (t === before) break;
  }
  return t
    .replace(STOPWORDS_RE, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple bigram-based similarity (Dice coefficient).
 * Fast, no dependencies, good enough for event name matching.
 */
export function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigramsA.set(bigram, (bigramsA.get(bigram) ?? 0) + 1);
  }

  let intersections = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigramsA.get(bigram) ?? 0;
    if (count > 0) {
      bigramsA.set(bigram, count - 1);
      intersections++;
    }
  }

  return (2.0 * intersections) / (a.length - 1 + (b.length - 1));
}

/**
 * Whether two events should be considered the same cross-source occurrence.
 * Pure predicate exported for unit tests.
 */
export function isDuplicate(
  a: {
    name: string;
    source: string;
    venueName: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
    startDate: Date;
  },
  b: typeof a
): boolean {
  if (a.source === b.source) return false;
  if (!a.state || a.state !== b.state) return false;
  if (Math.abs(a.startDate.getTime() - b.startDate.getTime()) > DEDUP_WINDOW_MS) return false;
  const aN = normaliseForMatch(a.name);
  const bN = normaliseForMatch(b.name);
  if (aN.length < 4 || bN.length < 4) return false;
  const sim = nameSimilarity(aN, bN);
  if (sim < VENUE_SIM) return false;
  const aV = a.venueName ? normaliseForMatch(a.venueName) : null;
  const bV = b.venueName ? normaliseForMatch(b.venueName) : null;
  const cityMatch = !!a.city && !!b.city && a.city === b.city;
  const venueMatch = !!aV && !!bV && aV === bV;
  const coordsMatch = withinRadius(a, b, COORDS_RADIUS_KM);
  return (sim >= STRONG_SIM && (cityMatch || venueMatch || coordsMatch)) ||
    (sim >= VENUE_SIM && venueMatch);
}
