// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { RawEvent } from "@/types/event";
import {
  assessEventQuality,
  assertSampleQuality,
  looksLikeThumbnail,
} from "./event-quality";

const NOW = new Date("2026-05-13T00:00:00Z");
const FUTURE = new Date("2026-06-01T19:00:00Z");

function makeEvent(overrides: Partial<RawEvent> = {}): RawEvent {
  return {
    sourceId: "https://example.com/e/123",
    name: "An Excellent Show",
    startDate: FUTURE,
    url: "https://example.com/e/123",
    imageUrl: "https://cdn.example.com/images/full/hero.jpg",
    venueName: "Some Venue",
    city: "Brisbane",
    state: "QLD",
    description: "Great event in town this weekend.",
    ...overrides,
  };
}

describe("assessEventQuality", () => {
  it("accepts a well-formed event", () => {
    const r = assessEventQuality(makeEvent(), { now: NOW });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("flags missing name", () => {
    const r = assessEventQuality(makeEvent({ name: "" }), { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.errors.map((e) => e.code)).toContain("missing_name");
  });

  it("flags generic placeholder names", () => {
    const r = assessEventQuality(makeEvent({ name: "TBA" }), { now: NOW });
    expect(r.errors.map((e) => e.code)).toContain("generic_name");
  });

  it("flags startDate equal to 'now' (fabricated) when there is no endDate", () => {
    const r = assessEventQuality(
      makeEvent({ startDate: NOW, endDate: undefined }),
      { now: NOW }
    );
    expect(r.errors.map((e) => e.code)).toContain("fabricated_start_date");
  });

  it("does NOT flag startDate=now when an endDate is present (ongoing event)", () => {
    const r = assessEventQuality(
      makeEvent({ startDate: NOW, endDate: FUTURE }),
      { now: NOW }
    );
    expect(r.errors.map((e) => e.code)).not.toContain("fabricated_start_date");
  });

  it("flags missing startDate", () => {
    const r = assessEventQuality(
      makeEvent({ startDate: "not-a-date" }),
      { now: NOW }
    );
    expect(r.errors.map((e) => e.code)).toContain("missing_start_date");
  });

  it("flags non-absolute url", () => {
    const r = assessEventQuality(makeEvent({ url: "/relative" }), { now: NOW });
    expect(r.errors.map((e) => e.code)).toContain("invalid_url");
  });

  it("flags thumbnail-shaped image urls", () => {
    const cases = [
      "https://cdn.example.com/foo?t=300x300",
      "https://cdn.example.com/foo-150x150.jpg",
      "https://cdn.example.com/foo/thumb/bar.jpg",
      "https://cdn.example.com/generated/480w-3-2/hero.jpg",
    ];
    for (const imageUrl of cases) {
      const r = assessEventQuality(makeEvent({ imageUrl }), { now: NOW });
      expect(
        r.errors.map((e) => e.code),
        `expected thumbnail flag for ${imageUrl}`
      ).toContain("thumbnail_image");
    }
  });

  it("allows full-resolution image urls", () => {
    const cases = [
      "https://cdn.example.com/images/full/hero.jpg",
      "https://cdn.example.com/generated/1280w-3-2/hero.jpg",
      "https://cdn.example.com/hero.jpg?w=1280",
    ];
    for (const imageUrl of cases) {
      const r = assessEventQuality(makeEvent({ imageUrl }), { now: NOW });
      expect(r.ok, `expected pass for ${imageUrl}`).toBe(true);
    }
  });

  it("flags raw HTML in description", () => {
    const r = assessEventQuality(
      makeEvent({ description: "Come along <p>this Saturday</p>" }),
      { now: NOW }
    );
    expect(r.errors.map((e) => e.code)).toContain("html_in_description");
  });

  it("warns on missing location signals", () => {
    const r = assessEventQuality(
      makeEvent({ venueName: undefined, venueAddress: undefined, city: undefined }),
      { now: NOW }
    );
    expect(r.warnings.map((e) => e.code)).toContain("missing_location");
    expect(r.ok).toBe(true); // warning only
  });
});

describe("looksLikeThumbnail", () => {
  it("matches known small variants", () => {
    expect(looksLikeThumbnail("https://x/y?t=480x480")).toBe(true);
    expect(looksLikeThumbnail("https://x/y-100x100.png")).toBe(true);
    expect(looksLikeThumbnail("https://x/generated/200w-3-2/z.jpg")).toBe(true);
  });

  it("ignores full-res patterns", () => {
    expect(looksLikeThumbnail("https://x/y?w=1280")).toBe(false);
    expect(looksLikeThumbnail("https://x/generated/1280w-3-2/z.jpg")).toBe(false);
    expect(looksLikeThumbnail("https://x/hero.jpg")).toBe(false);
  });
});

describe("assertSampleQuality", () => {
  it("passes when all sampled events are clean", () => {
    const events = [makeEvent(), makeEvent({ name: "Another Great Show" })];
    expect(() =>
      assertSampleQuality(events, { source: "test", now: NOW })
    ).not.toThrow();
  });

  it("throws when any sampled event fails", () => {
    const events = [
      makeEvent(),
      makeEvent({ imageUrl: "https://x/y?t=300x300" }),
    ];
    expect(() =>
      assertSampleQuality(events, { source: "test", sampleSize: 2, now: NOW })
    ).toThrow(/thumbnail_image/);
  });

  it("throws when the adapter returns nothing", () => {
    expect(() =>
      assertSampleQuality([], { source: "test", now: NOW })
    ).toThrow(/zero events/);
  });
});
