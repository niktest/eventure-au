import { describe, it, expect } from "vitest";
import {
  ensureHttps,
  extractBackgroundImage,
  parseHumanDate,
  resolveUrl,
} from "./scrape-helpers";

describe("resolveUrl", () => {
  it("resolves relative paths against the base", () => {
    expect(resolveUrl("/whats-on/foo", "https://www.hota.com.au")).toBe(
      "https://www.hota.com.au/whats-on/foo"
    );
  });

  it("returns absolute URLs unchanged", () => {
    expect(resolveUrl("https://cdn.example.com/a.jpg", "https://www.hota.com.au")).toBe(
      "https://cdn.example.com/a.jpg"
    );
  });

  it("returns undefined for empty input", () => {
    expect(resolveUrl(undefined, "https://x")).toBeUndefined();
    expect(resolveUrl("", "https://x")).toBeUndefined();
  });
});

describe("ensureHttps", () => {
  it("upgrades http to https", () => {
    expect(ensureHttps("http://example.com/x.jpg")).toBe("https://example.com/x.jpg");
  });

  it("leaves https alone", () => {
    expect(ensureHttps("https://example.com/x.jpg")).toBe("https://example.com/x.jpg");
  });

  it("returns undefined for empty input", () => {
    expect(ensureHttps(undefined)).toBeUndefined();
  });
});

describe("extractBackgroundImage", () => {
  it("pulls the URL out of a background-image style", () => {
    expect(
      extractBackgroundImage("background-image:url(https://cdn.example.com/a.jpg); height:200px")
    ).toBe("https://cdn.example.com/a.jpg");
  });

  it("handles single quotes", () => {
    expect(extractBackgroundImage("background-image: url('https://cdn.example.com/a.jpg')")).toBe(
      "https://cdn.example.com/a.jpg"
    );
  });

  it("returns undefined when the property is absent", () => {
    expect(extractBackgroundImage("color:red")).toBeUndefined();
    expect(extractBackgroundImage(undefined)).toBeUndefined();
  });
});

describe("parseHumanDate", () => {
  const now = new Date("2026-05-07T00:00:00Z");

  it("parses 'Sat 9 May' relative to now", () => {
    const d = parseHumanDate("Sat 9 May", { now });
    expect(d?.toISOString()).toBe("2026-05-09T00:00:00.000Z");
  });

  it("parses 'Saturday 23 May' (full weekday)", () => {
    const d = parseHumanDate("Saturday 23 May", { now });
    expect(d?.toISOString()).toBe("2026-05-23T00:00:00.000Z");
  });

  it("parses '14 May 2026' with explicit year", () => {
    const d = parseHumanDate("14 May 2026", { now });
    expect(d?.toISOString()).toBe("2026-05-14T00:00:00.000Z");
  });

  it("rolls forward to next year when the date has clearly passed", () => {
    const d = parseHumanDate("Sat 1 February", { now });
    expect(d?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });

  it("returns the start of a date range", () => {
    const d = parseHumanDate("Fri 8 May - Fri 11 Dec", { now });
    expect(d?.toISOString()).toBe("2026-05-08T00:00:00.000Z");
  });

  it("returns null for unparseable input", () => {
    expect(parseHumanDate("TBA", { now })).toBeNull();
    expect(parseHumanDate("", { now })).toBeNull();
    expect(parseHumanDate("Tuesdays at 7pm", { now })).toBeNull();
  });
});
