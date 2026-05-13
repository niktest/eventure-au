import { describe, it, expect } from "vitest";
import { normalise, normaliseState, decodeHtmlEntities, cleanTitle } from "./index";
import type { RawEvent } from "@/types/event";

function makeRawEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    sourceId: "test-123",
    name: "Test Event",
    startDate: new Date("2026-06-15T18:00:00Z"),
    ...overrides,
  };
}

describe("normalise", () => {
  it("normalises a minimal raw event with defaults", () => {
    const raw = makeRawEvent();
    const result = normalise("test-source", raw);

    expect(result.name).toBe("Test Event");
    expect(result.source).toBe("test-source");
    expect(result.sourceId).toBe("test-123");
    expect(result.city).toBe("Unknown");
    expect(result.state).toBe("Unknown");
    expect(result.country).toBe("AU");
    expect(result.currency).toBe("AUD");
    expect(result.isFree).toBe(false);
    expect(result.affiliateEligible).toBe(false);
    expect(result.status).toBe("published");
    expect(result.description).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.tags).toEqual([]);
  });

  it("preserves provided fields", () => {
    const raw = makeRawEvent({
      description: "  A great event  ",
      city: "Gold Coast",
      state: "QLD",
      venueName: "HOTA",
      venueAddress: "135 Bundall Rd",
      latitude: -28.0,
      longitude: 153.4,
      isFree: true,
      tags: ["music", "outdoor"],
      imageUrl: "https://example.com/img.jpg",
    });
    const result = normalise("hota", raw);

    expect(result.description).toBe("A great event");
    expect(result.city).toBe("Gold Coast");
    expect(result.state).toBe("QLD");
    expect(result.venueName).toBe("HOTA");
    expect(result.venueAddress).toBe("135 Bundall Rd");
    expect(result.latitude).toBe(-28.0);
    expect(result.longitude).toBe(153.4);
    expect(result.isFree).toBe(true);
    expect(result.tags).toEqual(["music", "outdoor"]);
    expect(result.imageUrl).toBe("https://example.com/img.jpg");
  });

  it("generates a unique slug from name and sourceId", () => {
    const raw = makeRawEvent({ name: "Summer Music Festival", sourceId: "abc12345xyz" });
    const result = normalise("test", raw);

    expect(result.slug).toMatch(/^summer-music-festival-/);
    expect(result.slug.length).toBeGreaterThan(0);
    expect(result.slug).not.toContain(" ");
  });

  it("generates different slugs for different sourceIds", () => {
    const raw1 = makeRawEvent({ sourceId: "aaa111" });
    const raw2 = makeRawEvent({ sourceId: "bbb222" });
    const slug1 = normalise("src", raw1).slug;
    const slug2 = normalise("src", raw2).slug;

    expect(slug1).not.toBe(slug2);
  });

  it("parses string dates into Date objects", () => {
    const raw = makeRawEvent({
      startDate: "2026-12-25T10:00:00Z",
      endDate: "2026-12-25T22:00:00Z",
    });
    const result = normalise("test", raw);

    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.startDate.toISOString()).toBe("2026-12-25T10:00:00.000Z");
    expect(result.endDate!.toISOString()).toBe("2026-12-25T22:00:00.000Z");
  });

  it("trims whitespace from name and description", () => {
    const raw = makeRawEvent({
      name: "  Whitespace Event  ",
      description: "  Has spaces  ",
    });
    const result = normalise("test", raw);

    expect(result.name).toBe("Whitespace Event");
    expect(result.description).toBe("Has spaces");
  });

  it("handles ticket/pricing fields", () => {
    const raw = makeRawEvent({
      priceMin: 25.0,
      priceMax: 150.0,
      ticketUrl: "https://tickets.example.com",
      ticketProvider: "eventbrite",
      ticketAvailability: "available",
    });
    const result = normalise("test", raw);

    expect(result.priceMin).toBe(25.0);
    expect(result.priceMax).toBe(150.0);
    expect(result.ticketUrl).toBe("https://tickets.example.com");
    expect(result.ticketProvider).toBe("eventbrite");
    expect(result.ticketAvailability).toBe("available");
  });
});

describe("category inference", () => {
  it("infers MUSIC from name containing 'concert'", () => {
    const raw = makeRawEvent({ name: "Jazz Concert Night" });
    expect(normalise("test", raw).category).toBe("MUSIC");
  });

  it("infers MUSIC from 'live band' in description", () => {
    const raw = makeRawEvent({ name: "Friday Night", description: "Live band performing" });
    expect(normalise("test", raw).category).toBe("MUSIC");
  });

  it("infers FESTIVAL from name", () => {
    const raw = makeRawEvent({ name: "Splendour Festival 2026" });
    expect(normalise("test", raw).category).toBe("FESTIVAL");
  });

  it("infers MARKETS from 'farmers market'", () => {
    const raw = makeRawEvent({ name: "Sunday Farmers Market" });
    expect(normalise("test", raw).category).toBe("MARKETS");
  });

  it("infers SPORTS from 'cricket' in name", () => {
    const raw = makeRawEvent({ name: "Australia vs England Cricket" });
    expect(normalise("test", raw).category).toBe("SPORTS");
  });

  it("infers FAMILY from 'kids' in description", () => {
    const raw = makeRawEvent({ name: "Weekend Fun", description: "Great for kids and families" });
    expect(normalise("test", raw).category).toBe("FAMILY");
  });

  it("infers NIGHTLIFE from 'club' in tags", () => {
    const raw = makeRawEvent({ name: "Saturday Vibes", tags: ["club", "dj"] });
    expect(normalise("test", raw).category).toBe("NIGHTLIFE");
  });

  it("infers FOOD_DRINK from 'wine' in name", () => {
    const raw = makeRawEvent({ name: "Gold Coast Wine Tasting" });
    expect(normalise("test", raw).category).toBe("FOOD_DRINK");
  });

  it("infers ARTS from 'exhibition' in name", () => {
    const raw = makeRawEvent({ name: "Contemporary Art Exhibition" });
    expect(normalise("test", raw).category).toBe("ARTS");
  });

  it("infers COMEDY from 'stand-up' in name", () => {
    const raw = makeRawEvent({ name: "Stand-up Comedy Night" });
    expect(normalise("test", raw).category).toBe("COMEDY");
  });

  it("infers THEATRE from 'musical' in name", () => {
    const raw = makeRawEvent({ name: "Hamilton the Musical" });
    expect(normalise("test", raw).category).toBe("THEATRE");
  });

  it("infers OUTDOOR from 'hike' in name", () => {
    const raw = makeRawEvent({ name: "Morning Hike at Burleigh" });
    expect(normalise("test", raw).category).toBe("OUTDOOR");
  });

  it("infers COMMUNITY from 'charity' in name", () => {
    const raw = makeRawEvent({ name: "Annual Charity Gala" });
    expect(normalise("test", raw).category).toBe("COMMUNITY");
  });

  it("defaults to OTHER when no keywords match", () => {
    const raw = makeRawEvent({ name: "Something Happening" });
    expect(normalise("test", raw).category).toBe("OTHER");
  });

  it("uses explicit category when provided", () => {
    const raw = makeRawEvent({ name: "My Event", category: "SPORTS" });
    expect(normalise("test", raw).category).toBe("SPORTS");
  });
});

describe("decodeHtmlEntities", () => {
  it("decodes numeric entities", () => {
    expect(decodeHtmlEntities("&#39;Hello&#39;")).toBe("'Hello'");
  });

  it("decodes hex entities", () => {
    expect(decodeHtmlEntities("&#x27;Hello&#x27;")).toBe("'Hello'");
  });

  it("decodes named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry &lt;3 &quot;quote&quot;")).toBe(
      'Tom & Jerry <3 "quote"',
    );
  });

  it("collapses double-encoded sequences (&amp;#39; → ')", () => {
    expect(decodeHtmlEntities("&amp;#39;THE MISSING&amp;#39;")).toBe("'THE MISSING'");
  });

  it("leaves unknown entities intact", () => {
    expect(decodeHtmlEntities("&unknown;")).toBe("&unknown;");
  });
});

describe("cleanTitle", () => {
  it("strips trailing URLs from titles", () => {
    expect(cleanTitle("Some Event https://example.com/x")).toBe("Some Event");
  });

  it("decodes entities and strips URLs in one pass", () => {
    expect(
      cleanTitle("&#39;THE MISSING MOTHER&#39; BY MALI CORNISH BOOK LAUNCH https://moshtix.com/x"),
    ).toBe("'THE MISSING MOTHER' BY MALI CORNISH BOOK LAUNCH");
  });

  it("collapses internal whitespace", () => {
    expect(cleanTitle("  Multi   space   title  ")).toBe("Multi space title");
  });
});

describe("normalise — entity-encoded source data (EVE-141 regression)", () => {
  it("decodes &#39; in titles instead of storing it literally", () => {
    const raw = makeRawEvent({
      name: "&#39;THE MISSING MOTHER&#39; BY MALI CORNISH BOOK LAUNCH",
      sourceId: "moshtix-abc",
    });
    const result = normalise("moshtix", raw);
    expect(result.name).toBe("'THE MISSING MOTHER' BY MALI CORNISH BOOK LAUNCH");
  });

  it("produces a clean slug without numeric entity remnants", () => {
    const raw = makeRawEvent({
      name: "&#39;THE MISSING MOTHER&#39; BY MALI CORNISH BOOK LAUNCH",
      sourceId: "moshtix-abc12345",
    });
    const result = normalise("moshtix", raw);
    expect(result.slug).not.toMatch(/39/);
    expect(result.slug).toMatch(/^the-missing-mother-by-mali-cornish-book-launch-/);
  });

  it("strips trailing URLs from slug and title", () => {
    const raw = makeRawEvent({
      name: "Cool Event https://www.moshtix.com.au/foo",
      sourceId: "x",
    });
    const result = normalise("moshtix", raw);
    expect(result.name).toBe("Cool Event");
    expect(result.slug).not.toMatch(/https/);
    expect(result.slug).toMatch(/^cool-event-/);
  });

  it("decodes entities in description as well", () => {
    const raw = makeRawEvent({
      description: "Tickets at &amp;quot;the door&amp;quot;",
    });
    const result = normalise("test", raw);
    expect(result.description).toBe('Tickets at "the door"');
  });

  it("upgrades http:// image URLs to https://", () => {
    const raw = makeRawEvent({
      imageUrl: "http://www.moshtix.com.au/uploads/abc123",
    });
    const result = normalise("moshtix", raw);
    expect(result.imageUrl).toBe("https://www.moshtix.com.au/uploads/abc123");
  });

  it("leaves https:// image URLs untouched", () => {
    const raw = makeRawEvent({
      imageUrl: "https://cdn.example.com/img.jpg",
    });
    const result = normalise("test", raw);
    expect(result.imageUrl).toBe("https://cdn.example.com/img.jpg");
  });

  it("falls back to source-id-only slug when title is entirely entity garbage", () => {
    const raw = makeRawEvent({ name: "&#9;&#10;", sourceId: "abc12345" });
    const result = normalise("test", raw);
    // Slug should still be unique and non-empty
    expect(result.slug.length).toBeGreaterThan(0);
    expect(result.slug).not.toMatch(/^-/);
  });
});

describe("normalise — entity-encoded venue fields (EVE-144 regression)", () => {
  it("decodes &#39; in venueName", () => {
    const raw = makeRawEvent({
      venueName: "Brunswick Artists&#39; Bar",
    });
    expect(normalise("test", raw).venueName).toBe("Brunswick Artists' Bar");
  });

  it("decodes &amp; in venueAddress", () => {
    const raw = makeRawEvent({
      venueAddress: "Smith &amp; Jones St, BRUNSWICK",
    });
    expect(normalise("test", raw).venueAddress).toBe("Smith & Jones St, BRUNSWICK");
  });

  it("decodes entities in city and normalises state", () => {
    const raw = makeRawEvent({
      city: "St&#39;Kilda",
      state: "VIC&amp;",
    });
    const result = normalise("test", raw);
    expect(result.city).toBe("St'Kilda");
    // After decoding, "VIC&" doesn't match any known form so it falls back to
    // Unknown rather than being stored verbatim — see normaliseState tests.
    expect(result.state).toBe("Unknown");
  });

  it("returns null for venue fields that decode to whitespace", () => {
    const raw = makeRawEvent({ venueName: "   ", venueAddress: "" });
    const result = normalise("test", raw);
    expect(result.venueName).toBeNull();
    expect(result.venueAddress).toBeNull();
  });

  it("falls back to Unknown when city/state decode to empty", () => {
    const raw = makeRawEvent({ city: "   " });
    const result = normalise("test", raw);
    expect(result.city).toBe("Unknown");
  });
});

describe("normaliseState (EVE-195)", () => {
  it("passes through canonical 3-letter codes", () => {
    for (const code of ["QLD", "NSW", "VIC", "WA", "SA", "TAS", "NT", "ACT"]) {
      expect(normaliseState(code)).toBe(code);
    }
  });

  it("expands 2-letter truncations (QL/NS/VI/TA/AC) to canonical codes", () => {
    expect(normaliseState("QL")).toBe("QLD");
    expect(normaliseState("NS")).toBe("NSW");
    expect(normaliseState("VI")).toBe("VIC");
    expect(normaliseState("TA")).toBe("TAS");
    expect(normaliseState("AC")).toBe("ACT");
  });

  it("expands full state names (any case) to canonical codes", () => {
    expect(normaliseState("Queensland")).toBe("QLD");
    expect(normaliseState("new south wales")).toBe("NSW");
    expect(normaliseState("VICTORIA")).toBe("VIC");
    expect(normaliseState("Western Australia")).toBe("WA");
    expect(normaliseState("South Australia")).toBe("SA");
    expect(normaliseState("Tasmania")).toBe("TAS");
    expect(normaliseState("Northern Territory")).toBe("NT");
    expect(normaliseState("Australian Capital Territory")).toBe("ACT");
  });

  it("strips ISO 3166-2 AU- prefix", () => {
    expect(normaliseState("AU-QLD")).toBe("QLD");
    expect(normaliseState("au-nsw")).toBe("NSW");
  });

  it("tolerates trailing punctuation and whitespace", () => {
    expect(normaliseState(" QLD ")).toBe("QLD");
    expect(normaliseState("VIC,")).toBe("VIC");
    expect(normaliseState("NSW.")).toBe("NSW");
  });

  it("returns Unknown for null, empty, or unrecognised input", () => {
    expect(normaliseState(null)).toBe("Unknown");
    expect(normaliseState(undefined)).toBe("Unknown");
    expect(normaliseState("")).toBe("Unknown");
    expect(normaliseState("   ")).toBe("Unknown");
    expect(normaliseState("California")).toBe("Unknown");
    expect(normaliseState("XYZ")).toBe("Unknown");
  });
});
