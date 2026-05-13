import type { Event } from "@/types/event";
import { getSiteUrl } from "./site-url";

const SITE_NAME = "Festlio";

/**
 * Generate schema.org/Event JSON-LD for a single event.
 * https://developers.google.com/search/docs/appearance/structured-data/event
 */
export function eventJsonLd(event: Event): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/events/${event.slug}`;
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
    inLanguage: "en-AU",
    url: canonicalUrl,
  };

  if (event.endDate) {
    ld.endDate = event.endDate.toISOString();
  }

  if (event.imageUrl) {
    ld.image = [event.imageUrl];
  }

  if (event.sourceUrl || event.source) {
    ld.organizer = {
      "@type": "Organization",
      name: event.source,
      ...(event.sourceUrl ? { url: event.sourceUrl } : {}),
    };
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

  return ld;
}

/**
 * schema.org/WebSite with SearchAction so Google can render a sitelinks searchbox.
 * https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox
 */
export function websiteJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/events?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * schema.org/Organization for the site owner. Used on the homepage so Google
 * can associate the brand with festlio.com.
 */
export function organizationJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
  };
}

export type ItemListEntry = {
  name: string;
  url: string;
};

/**
 * schema.org/ItemList summarising upcoming events on the homepage. The Event
 * detail pages remain the canonical schema.org/Event source; this list just
 * points Google at those URLs.
 */
export function itemListJsonLd(items: ItemListEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: item.url,
      name: item.name,
    })),
  };
}
