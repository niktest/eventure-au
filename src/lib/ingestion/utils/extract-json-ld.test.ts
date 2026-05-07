import { describe, it, expect } from "vitest";
import { extractJsonLdEvents } from "./extract-json-ld";

const DEFAULTS = {
  sourceIdPrefix: "test",
  city: "Gold Coast",
  state: "QLD",
};

function wrap(blocks: string[]): string {
  return `<html><head>${blocks
    .map((b) => `<script type="application/ld+json">${b}</script>`)
    .join("")}</head><body></body></html>`;
}

describe("extractJsonLdEvents", () => {
  it("extracts a single Event block", () => {
    const html = wrap([
      JSON.stringify({
        "@type": "Event",
        name: "Test Concert",
        startDate: "2026-06-01T19:00:00+10:00",
        endDate: "2026-06-01T22:00:00+10:00",
        url: "https://example.com/concert",
        image: "https://example.com/c.jpg",
        location: { name: "Some Hall", address: { streetAddress: "1 Main St" } },
      }),
    ]);
    const events = extractJsonLdEvents(html, DEFAULTS);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sourceId: "https://example.com/concert",
      name: "Test Concert",
      url: "https://example.com/concert",
      imageUrl: "https://example.com/c.jpg",
      venueName: "Some Hall",
      venueAddress: "1 Main St",
    });
    expect(events[0].startDate).toBeInstanceOf(Date);
  });

  it("walks an @graph array", () => {
    const html = wrap([
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", name: "x" },
          { "@type": "Event", name: "Graph Event", startDate: "2026-07-01" },
        ],
      }),
    ]);
    const events = extractJsonLdEvents(html, DEFAULTS);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("Graph Event");
  });

  it("ignores non-Event types", () => {
    const html = wrap([
      JSON.stringify({ "@type": "Organization", name: "x" }),
      JSON.stringify({ "@type": "WebPage" }),
    ]);
    expect(extractJsonLdEvents(html, DEFAULTS)).toEqual([]);
  });

  it("accepts subtypes like MusicEvent", () => {
    const html = wrap([
      JSON.stringify({
        "@type": "MusicEvent",
        name: "Subtype Gig",
        startDate: "2026-08-01",
      }),
    ]);
    expect(extractJsonLdEvents(html, DEFAULTS)).toHaveLength(1);
  });

  it("falls back to defaults when location is missing", () => {
    const html = wrap([
      JSON.stringify({
        "@type": "Event",
        name: "No Venue",
        startDate: "2026-08-15",
      }),
    ]);
    const events = extractJsonLdEvents(html, {
      ...DEFAULTS,
      venueName: "Default Venue",
      venueAddress: "Default Address",
    });
    expect(events[0].venueName).toBe("Default Venue");
    expect(events[0].venueAddress).toBe("Default Address");
  });

  it("synthesises a sourceId when item.url is missing", () => {
    const html = wrap([
      JSON.stringify({
        "@type": "Event",
        name: "Anonymous Show",
        startDate: "2026-08-15",
      }),
    ]);
    const events = extractJsonLdEvents(html, DEFAULTS);
    expect(events[0].sourceId).toBe("test-anonymous-show");
  });

  it("skips events without name or startDate", () => {
    const html = wrap([
      JSON.stringify({ "@type": "Event", startDate: "2026-08-01" }),
      JSON.stringify({ "@type": "Event", name: "No date" }),
    ]);
    expect(extractJsonLdEvents(html, DEFAULTS)).toEqual([]);
  });

  it("tolerates malformed JSON-LD blocks", () => {
    const html = `<script type="application/ld+json">{ "@type": "Event" not json }</script><script type="application/ld+json">${JSON.stringify(
      { "@type": "Event", name: "Survives", startDate: "2026-09-01" }
    )}</script>`;
    const events = extractJsonLdEvents(html, DEFAULTS);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("Survives");
  });

  it("picks the first image when image is an array", () => {
    const html = wrap([
      JSON.stringify({
        "@type": "Event",
        name: "Multi Image",
        startDate: "2026-10-01",
        image: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      }),
    ]);
    expect(extractJsonLdEvents(html, DEFAULTS)[0].imageUrl).toBe(
      "https://example.com/a.jpg"
    );
  });
});
