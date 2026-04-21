import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalisedEvent } from "@/types/event";

/**
 * Upsert events into the database, deduplicating by (source, sourceId).
 * Returns counts of created and updated events.
 */
export async function upsertEvents(
  events: NormalisedEvent[]
): Promise<{ created: number; updated: number; errors: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;

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
      }
    } catch (err) {
      console.error(`[dedup] Failed to upsert event "${event.name}":`, err);
      errors++;
    }
  }

  return { created, updated, errors };
}
