import type { Event } from "@/types/event";

/**
 * Generate schema.org/Event JSON-LD for a single event.
 * https://developers.google.com/search/docs/appearance/structured-data/event
 */
export function eventJsonLd(event: Event): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.startDate.toISOString(),
    description: event.description ?? undefined,
    eventStatus: event.status === "cancelled"
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  if (event.endDate) {
    ld.endDate = event.endDate.toISOString();
  }

  if (event.imageUrl) {
    ld.image = [event.imageUrl];
  }

  if (event.venueName) {
    ld.location = {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venueAddress ?? undefined,
        addressLocality: event.city,
        addressRegion: event.state,
        addressCountry: event.country,
      },
      ...(event.latitude && event.longitude
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: event.latitude,
              longitude: event.longitude,
            },
          }
        : {}),
    };
  }

  if (event.isFree) {
    ld.isAccessibleForFree = true;
    ld.offers = {
      "@type": "Offer",
      price: 0,
      priceCurrency: event.currency,
      availability: "https://schema.org/InStock",
      url: event.ticketUrl ?? event.url ?? undefined,
    };
  } else if (event.priceMin) {
    ld.offers = {
      "@type": "Offer",
      price: event.priceMin,
      priceCurrency: event.currency,
      availability: "https://schema.org/InStock",
      url: event.ticketUrl ?? event.url ?? undefined,
    };
  }

  if (event.url) {
    ld.url = event.url;
  }

  return ld;
}
