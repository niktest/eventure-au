import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalisedEvent } from "@/types/event";

/**
 * Upsert events into the database, deduplicating by (source, sourceId).
 * After upserting, runs cross-source fuzzy matching to flag potential duplicates.
 */
export async function upsertEvents(
  events: NormalisedEvent[]
): Promise<{ created: number; updated: number; errors: number; dupsLinked: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;
  let dupsLinked = 0;

  for (const event of events) {
    try {
      const existing = await prisma.event.findUnique({
        where: {
          source_sourceId: {
            source: event.source,
            sourceId: event.sourceId,
          },
        },
      });

      if (existing) {
        await prisma.event.update({
          where: { id: existing.id },
          data: {
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
        });
        updated++;
      } else {
        await prisma.event.create({
          data: {
            ...event,
            rawData: event.rawData ?? Prisma.JsonNull,
            priceTiers: event.priceTiers ?? Prisma.JsonNull,
          },
        });
        created++;

        // Run fuzzy cross-source matching for new events
        const linkedCount = await findAndLinkDuplicates(event);
        dupsLinked += linkedCount;
      }
    } catch (err) {
      console.error(`[dedup] Failed to upsert event "${event.name}":`, err);
      errors++;
    }
  }

  return { created, updated, errors, dupsLinked };
}

/**
 * Cross-source fuzzy matching.
 * Looks for events from different sources with similar name + date + venue.
 * When a match is found, the newer (lower-priority) event gets status=draft
 * so the higher-quality source's version is the published canonical.
 */
async function findAndLinkDuplicates(event: NormalisedEvent): Promise<number> {
  // Search for events from OTHER sources with a similar date window (±4 hours)
  const dateWindowMs = 4 * 60 * 60 * 1000;
  const startLow = new Date(event.startDate.getTime() - dateWindowMs);
  const startHigh = new Date(event.startDate.getTime() + dateWindowMs);

  try {
    const candidates = await prisma.event.findMany({
      where: {
        source: { not: event.source },
        startDate: { gte: startLow, lte: startHigh },
        city: event.city,
      },
      select: {
        id: true,
        name: true,
        venueName: true,
        source: true,
        status: true,
      },
    });

    let linked = 0;
    for (const candidate of candidates) {
      const similarity = nameSimilarity(
        normaliseForMatch(event.name),
        normaliseForMatch(candidate.name)
      );

      // Name must be at least 70% similar
      if (similarity < 0.7) continue;

      // Venue match boosts confidence (optional but helpful)
      const venueMatch =
        event.venueName &&
        candidate.venueName &&
        normaliseForMatch(event.venueName) ===
          normaliseForMatch(candidate.venueName);

      if (similarity >= 0.85 || venueMatch) {
        // Mark the incoming event as draft (keep the existing published one)
        await prisma.event.updateMany({
          where: {
            source: event.source,
            sourceId: event.sourceId,
          },
          data: { status: "draft" },
        });
        console.log(
          `[dedup] Cross-source match: "${event.name}" (${event.source}) ↔ "${candidate.name}" (${candidate.source}) — ${(similarity * 100).toFixed(0)}% similar`
        );
        linked++;
        break; // One match is enough to suppress
      }
    }
    return linked;
  } catch {
    return 0;
  }
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
