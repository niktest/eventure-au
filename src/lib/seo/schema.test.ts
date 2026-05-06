import { describe, it, expect } from "vitest";
import {
  eventJsonLd,
  itemListJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "./schema";
import type { Event } from "@/types/event";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "evt-1",
    slug: "test-event-abc",
    name: "Test Event",
    description: "A test event description",
    startDate: new Date("2026-07-10T09:00:00Z"),
    endDate: new Date("2026-07-10T17:00:00Z"),
    imageUrl: "https://example.com/event.jpg",
    url: "https://example.com/event",
    venueName: "HOTA",
    venueAddress: "135 Bundall Rd",
    city: "Gold Coast",
    state: "QLD",
    country: "AU",
    latitude: -28.0,
    longitude: 153.4,
    category: "ARTS",
    tags: ["art", "gallery"],
    isFree: false,
    priceMin: 25,
    priceMax: 75,
    currency: "AUD",
    ticketUrl: "https://tickets.example.com",
    ticketProvider: "eventbrite",
    ticketAvailability: "available",
    priceTiers: null,
    affiliateEligible: false,
    affiliateUrl: null,
    source: "test",
    sourceId: "test-123",
    sourceUrl: "https://source.example.com",
    rawData: null,
    status: "published",
    lastScrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Event;
}

describe("eventJsonLd", () => {
  it("produces valid schema.org/Event structure", () => {
    const event = makeEvent();
    const ld = eventJsonLd(event);

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Event");
    expect(ld.name).toBe("Test Event");
    expect(ld.startDate).toBe("2026-07-10T09:00:00.000Z");
    expect(ld.endDate).toBe("2026-07-10T17:00:00.000Z");
    expect(ld.description).toBe("A test event description");
    expect(ld.url).toBe("https://example.com/event");
  });

  it("includes image array when imageUrl is present", () => {
    const ld = eventJsonLd(makeEvent());
    expect(ld.image).toEqual(["https://example.com/event.jpg"]);
  });

  it("omits image when imageUrl is null", () => {
    const ld = eventJsonLd(makeEvent({ imageUrl: null }));
    expect(ld.image).toBeUndefined();
  });

  it("sets EventScheduled status for published events", () => {
    const ld = eventJsonLd(makeEvent({ status: "published" }));
    expect(ld.eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("sets EventCancelled status for cancelled events", () => {
    const ld = eventJsonLd(makeEvent({ status: "cancelled" }));
    expect(ld.eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("includes location with geo coordinates when available", () => {
    const ld = eventJsonLd(makeEvent());
    const location = ld.location as Record<string, unknown>;

    expect(location["@type"]).toBe("Place");
    expect(location.name).toBe("HOTA");

    const address = location.address as Record<string, unknown>;
    expect(address["@type"]).toBe("PostalAddress");
    expect(address.addressLocality).toBe("Gold Coast");
    expect(address.addressRegion).toBe("QLD");
    expect(address.addressCountry).toBe("AU");

    const geo = location.geo as Record<string, unknown>;
    expect(geo["@type"]).toBe("GeoCoordinates");
    expect(geo.latitude).toBe(-28.0);
    expect(geo.longitude).toBe(153.4);
  });

  it("omits geo when coordinates are null", () => {
    const ld = eventJsonLd(makeEvent({ latitude: null, longitude: null }));
    const location = ld.location as Record<string, unknown>;
    expect(location.geo).toBeUndefined();
  });

  it("omits location when venueName is null", () => {
    const ld = eventJsonLd(makeEvent({ venueName: null }));
    expect(ld.location).toBeUndefined();
  });

  it("includes free event offers with price 0", () => {
    const ld = eventJsonLd(makeEvent({ isFree: true, priceMin: null, priceMax: null }));
    expect(ld.isAccessibleForFree).toBe(true);

    const offers = ld.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe(0);
    expect(offers.priceCurrency).toBe("AUD");
    expect(offers.availability).toBe("https://schema.org/InStock");
  });

  it("includes paid event offers with priceMin", () => {
    const ld = eventJsonLd(makeEvent({ isFree: false, priceMin: 50 }));
    expect(ld.isAccessibleForFree).toBeUndefined();

    const offers = ld.offers as Record<string, unknown>;
    expect(offers.price).toBe(50);
    expect(offers.priceCurrency).toBe("AUD");
  });

  it("omits offers when not free and no priceMin", () => {
    const ld = eventJsonLd(makeEvent({ isFree: false, priceMin: null, priceMax: null }));
    expect(ld.offers).toBeUndefined();
  });

  it("omits endDate when null", () => {
    const ld = eventJsonLd(makeEvent({ endDate: null }));
    expect(ld.endDate).toBeUndefined();
  });

  it("sets attendance mode to offline", () => {
    const ld = eventJsonLd(makeEvent());
    expect(ld.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
  });
});

describe("websiteJsonLd", () => {
  it("produces a WebSite with SearchAction pointing at /events?q=", () => {
    const ld = websiteJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("Festlio");

    const url = ld.url as string;
    expect(url).toMatch(/^https?:\/\//);

    const action = ld.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect(action["query-input"]).toBe("required name=search_term_string");

    const target = action.target as Record<string, unknown>;
    expect(target["@type"]).toBe("EntryPoint");
    expect(target.urlTemplate).toBe(`${url}/events?q={search_term_string}`);
  });
});

describe("organizationJsonLd", () => {
  it("produces an Organization with the Festlio brand", () => {
    const ld = organizationJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Festlio");
    expect(typeof ld.url).toBe("string");
    expect(typeof ld.logo).toBe("string");
  });
});

describe("itemListJsonLd", () => {
  it("emits ListItem entries with 1-based positions", () => {
    const ld = itemListJsonLd([
      { name: "Event A", url: "https://festlio.com/events/a" },
      { name: "Event B", url: "https://festlio.com/events/b" },
    ]);
    expect(ld["@type"]).toBe("ItemList");

    const items = ld.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      url: "https://festlio.com/events/a",
      name: "Event A",
    });
    expect(items[1].position).toBe(2);
  });

  it("returns an empty list when given no items", () => {
    const ld = itemListJsonLd([]);
    expect(ld.itemListElement).toEqual([]);
  });
});
