import type { Event as PrismaEvent, EventCategory, EventStatus, TicketAvailability, Prisma } from "@prisma/client";

export type { EventCategory, EventStatus, TicketAvailability };
export type Event = PrismaEvent;

/**
 * Raw event data from a source adapter before normalisation.
 * Each adapter maps source-specific fields to this shape.
 */
export interface RawEvent {
  sourceId: string;
  name: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string;
  imageUrl?: string;
  url?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  category?: EventCategory;
  tags?: string[];
  isFree?: boolean;
  priceMin?: number;
  priceMax?: number;
  ticketUrl?: string;
  ticketProvider?: string;
  ticketAvailability?: TicketAvailability;
  priceTiers?: Array<{ name: string; price: number; currency: string }>;
  affiliateEligible?: boolean;
  rawData?: unknown;
}

/**
 * Normalised event ready for database upsert.
 */
export interface NormalisedEvent {
  slug: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  imageUrl: string | null;
  url: string | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  category: EventCategory;
  tags: string[];
  isFree: boolean;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  ticketUrl: string | null;
  ticketProvider: string | null;
  ticketAvailability: TicketAvailability | null;
  priceTiers: Prisma.InputJsonValue | null;
  affiliateEligible: boolean;
  affiliateUrl: string | null;
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  rawData: Prisma.InputJsonValue | null;
  status: EventStatus;
}

/**
 * Source adapter interface. Each source (Eventbrite, HOTA, etc.)
 * implements this to fetch and return raw events.
 */
export interface SourceAdapter {
  readonly name: string;
  fetch(): Promise<RawEvent[]>;
}
