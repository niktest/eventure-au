import type { Prisma } from "@prisma/client";

// Only the fields EventCard actually renders. Skips the heavy columns
// (description Text, priceTiers/rawData JSON) so 60-card lists ship 5–10x
// less data over the wire.
export const EVENT_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  startDate: true,
  imageUrl: true,
  isFree: true,
  priceMin: true,
  venueName: true,
  city: true,
  // Needed for distance sort when `?sort=nearme` is active (EVE-209).
  latitude: true,
  longitude: true,
} satisfies Prisma.EventSelect;

export type EventCardData = Prisma.EventGetPayload<{
  select: typeof EVENT_CARD_SELECT;
}>;
