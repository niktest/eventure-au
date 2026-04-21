import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Example source adapter — placeholder demonstrating the adapter interface.
 * Real adapters (Eventbrite, HOTA, Destination GC) will follow this pattern.
 */
export class ExampleAdapter implements SourceAdapter {
  readonly name = "example";

  async fetch(): Promise<RawEvent[]> {
    // This is a placeholder. Real adapters will scrape or call APIs.
    return [
      {
        sourceId: "example-001",
        name: "Gold Coast Markets at Marina Mirage",
        description:
          "Browse handmade crafts, local produce, and artisan goods at the iconic Marina Mirage every Sunday morning.",
        startDate: new Date("2026-05-04T07:00:00+10:00"),
        endDate: new Date("2026-05-04T12:00:00+10:00"),
        venueName: "Marina Mirage",
        venueAddress: "74 Seaworld Dr, Main Beach QLD 4217",
        city: "Gold Coast",
        state: "QLD",
        category: "MARKETS",
        tags: ["markets", "artisan", "local produce"],
        isFree: true,
        url: "https://example.com/gc-markets",
      },
      {
        sourceId: "example-002",
        name: "Live Music at Burleigh Pavilion",
        description:
          "Catch live sets from local and touring artists at the Burleigh Pavilion every Friday night.",
        startDate: new Date("2026-05-02T18:00:00+10:00"),
        endDate: new Date("2026-05-02T23:00:00+10:00"),
        venueName: "Burleigh Pavilion",
        venueAddress: "43 Goodwin Terrace, Burleigh Heads QLD 4220",
        city: "Gold Coast",
        state: "QLD",
        category: "MUSIC",
        tags: ["live music", "nightlife"],
        isFree: false,
        priceMin: 15,
        priceMax: 30,
        ticketUrl: "https://example.com/burleigh-music",
      },
    ];
  }
}
