import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalisedEvent } from "@/types/event";

const DEDUP_WINDOW_MS = 4 * 60 * 60 * 1000;

// Vercel runs ingestion in syd1 but Neon lives in us-east-1, so each query
// pays ~200ms RTT. With ~3500 TM events doing two sequential queries each, the
// 300s function cap is hit before the loop finishes. Bounded concurrency keeps
// us inside Neon's pgBouncer pool while amortising the latency.
const UPSERT_CONCURRENCY = 16;

interface DedupCandidate {
  id: string;
  name: string;
  venueName: string | null;
  source: string;
  city: string | null;
  startDate: Date;
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
  const candidatesByCity = await preloadDedupCandidates(source, events);

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
        if (matchAgainstCandidates(event, candidatesByCity)) {
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
 * incoming event, indexed by city. This replaces N per-event findMany calls
 * with a single query bounded by the union of incoming (city, date) ranges.
 */
async function preloadDedupCandidates(
  source: string,
  events: NormalisedEvent[]
): Promise<Map<string, DedupCandidate[]>> {
  const cities = new Set<string>();
  let minTime = Number.POSITIVE_INFINITY;
  let maxTime = Number.NEGATIVE_INFINITY;

  for (const e of events) {
    if (e.city) cities.add(e.city);
    const t = e.startDate.getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }

  if (cities.size === 0 || !Number.isFinite(minTime)) {
    return new Map();
  }

  const candidates = await prisma.event.findMany({
    where: {
      source: { not: source },
      city: { in: [...cities] },
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
      startDate: true,
    },
  });

  const byCity = new Map<string, DedupCandidate[]>();
  for (const c of candidates) {
    if (!c.city) continue;
    const list = byCity.get(c.city);
    if (list) {
      list.push(c);
    } else {
      byCity.set(c.city, [c]);
    }
  }
  return byCity;
}

/**
 * Cross-source fuzzy match against the pre-loaded candidate index.
 * Returns true if the incoming event should be marked as a duplicate.
 */
function matchAgainstCandidates(
  event: NormalisedEvent,
  candidatesByCity: Map<string, DedupCandidate[]>
): boolean {
  if (!event.city) return false;
  const candidates = candidatesByCity.get(event.city);
  if (!candidates || candidates.length === 0) return false;

  const startTime = event.startDate.getTime();
  const lo = startTime - DEDUP_WINDOW_MS;
  const hi = startTime + DEDUP_WINDOW_MS;
  const eventNameNormalised = normaliseForMatch(event.name);
  const eventVenueNormalised = event.venueName ? normaliseForMatch(event.venueName) : null;

  for (const candidate of candidates) {
    const ct = candidate.startDate.getTime();
    if (ct < lo || ct > hi) continue;

    const similarity = nameSimilarity(eventNameNormalised, normaliseForMatch(candidate.name));
    if (similarity < 0.7) continue;

    const venueMatch =
      eventVenueNormalised !== null &&
      candidate.venueName !== null &&
      eventVenueNormalised === normaliseForMatch(candidate.venueName);

    if (similarity >= 0.85 || venueMatch) {
      console.log(
        `[dedup] Cross-source match: "${event.name}" (${event.source}) ↔ "${candidate.name}" (${candidate.source}) — ${(similarity * 100).toFixed(0)}% similar`
      );
      return true;
    }
  }
  return false;
}

/** Strip noise for matching: lowercase, remove articles/punctuation, collapse whitespace */
function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(the|a|an|at|in|on)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple bigram-based similarity (Dice coefficient).
 * Fast, no dependencies, good enough for event name matching.
 */
function nameSimilarity(a: string, b: string): number {
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
