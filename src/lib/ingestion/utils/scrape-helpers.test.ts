import { describe, it, expect } from "vitest";
import {
  ensureHttps,
  extractBackgroundImage,
  parseHumanDate,
  resolveUrl,
  upgradeAtdwImage,
  upgradeEventbriteImage,
  upgradeHotaImage,
  upgradeMoshtixImage,
  upgradeStylelabsImage,
  upgradeWordpressThumbnail,
  stripHtmlDescription,
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

describe("upgradeStylelabsImage", () => {
  it("strips a `t=300x300` thumbnail param while preserving `v=`", () => {
    expect(
      upgradeStylelabsImage(
        "https://destinationgoldcoast.stylelabs.cloud/api/public/content/abc?v=feeabacf&t=300x300"
      )
    ).toBe(
      "https://destinationgoldcoast.stylelabs.cloud/api/public/content/abc?v=feeabacf"
    );
  });

  it("strips a `t=` param when it is the only query param", () => {
    expect(
      upgradeStylelabsImage(
        "https://destinationgoldcoast.stylelabs.cloud/api/public/content/abc?t=300x300"
      )
    ).toBe(
      "https://destinationgoldcoast.stylelabs.cloud/api/public/content/abc"
    );
  });

  it("leaves non-stylelabs URLs alone", () => {
    expect(upgradeStylelabsImage("https://other.com/x.jpg?t=300x300")).toBe(
      "https://other.com/x.jpg?t=300x300"
    );
  });

  it("returns undefined for empty input", () => {
    expect(upgradeStylelabsImage(undefined)).toBeUndefined();
  });
});

describe("upgradeHotaImage", () => {
  it("rewrites a 480w listing thumb to 1280w", () => {
    expect(upgradeHotaImage("/generated/480w-3-2/foo-jpg.jpg?123")).toBe(
      "/generated/1280w-3-2/foo-jpg.jpg?123"
    );
  });

  it("rewrites portrait 360w-2-3 too, preserving aspect ratio", () => {
    expect(upgradeHotaImage("/generated/360w-2-3/poster-jpg.jpg")).toBe(
      "/generated/1280w-2-3/poster-jpg.jpg"
    );
  });

  it("leaves a 1280w URL unchanged", () => {
    expect(upgradeHotaImage("/generated/1280w-3-2/foo.jpg")).toBe(
      "/generated/1280w-3-2/foo.jpg"
    );
  });

  it("leaves URLs without the /generated/<width>w-<aspect>/ pattern alone", () => {
    expect(upgradeHotaImage("https://cdn.example.com/foo.jpg")).toBe(
      "https://cdn.example.com/foo.jpg"
    );
  });
});

describe("upgradeWordpressThumbnail", () => {
  it("strips the `-WIDTHxHEIGHT` suffix to expose the original upload", () => {
    expect(
      upgradeWordpressThumbnail(
        "https://sandstonepointhotel.com.au/wp-content/uploads/2026/02/foo_-650x366.jpg"
      )
    ).toBe(
      "https://sandstonepointhotel.com.au/wp-content/uploads/2026/02/foo_.jpg"
    );
  });

  it("preserves a query string after the suffix", () => {
    expect(
      upgradeWordpressThumbnail(
        "https://example.com/foo-1024x576.jpg?v=2"
      )
    ).toBe("https://example.com/foo.jpg?v=2");
  });

  it("leaves URLs without a thumbnail suffix unchanged", () => {
    expect(upgradeWordpressThumbnail("https://example.com/foo.jpg")).toBe(
      "https://example.com/foo.jpg"
    );
  });
});

describe("upgradeMoshtixImage", () => {
  it("upgrades x140x140 to x600x600", () => {
    expect(
      upgradeMoshtixImage(
        "https://www.moshtix.com.au/uploads/1fb03b9c-525f-497f-b291-8106eb08d102x140x140"
      )
    ).toBe(
      "https://www.moshtix.com.au/uploads/1fb03b9c-525f-497f-b291-8106eb08d102x600x600"
    );
  });

  it("rewrites x300x300 thumbnails too", () => {
    expect(
      upgradeMoshtixImage("http://www.moshtix.com.au/uploads/abcx300x300")
    ).toBe("http://www.moshtix.com.au/uploads/abcx600x600");
  });

  it("leaves non-moshtix URLs alone", () => {
    expect(upgradeMoshtixImage("https://other.com/foo")).toBe(
      "https://other.com/foo"
    );
  });
});

describe("upgradeAtdwImage", () => {
  const Q =
    "q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjVmMzM1MGE2ZGViNjgxY2Q0YmIyMjA1OCJ9";

  it("bumps w=800 to w=1920 and drops h=", () => {
    expect(
      upgradeAtdwImage(
        `https://assets.atdw-online.com.au/images/abc.jpeg?rect=0%2C150%2C1600%2C900&w=800&h=450&rot=360&${Q}`
      )
    ).toBe(
      `https://assets.atdw-online.com.au/images/abc.jpeg?rect=0%2C150%2C1600%2C900&w=1920&rot=360&${Q}`
    );
  });

  it("leaves w=1920+ alone", () => {
    expect(
      upgradeAtdwImage("https://assets.atdw-online.com.au/images/abc.jpeg?w=2400")
    ).toBe("https://assets.atdw-online.com.au/images/abc.jpeg?w=2400");
  });

  it("leaves non-ATDW URLs alone", () => {
    expect(upgradeAtdwImage("https://cdn.example.com/foo.jpg?w=800&h=450")).toBe(
      "https://cdn.example.com/foo.jpg?w=800&h=450"
    );
  });

  it("returns undefined for empty input", () => {
    expect(upgradeAtdwImage(undefined)).toBeUndefined();
  });
});

describe("upgradeEventbriteImage", () => {
  it("extracts the cdn.evbuc.com original from the img.evbuc.com wrapper", () => {
    expect(
      upgradeEventbriteImage(
        "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F722508859%2F90491413639%2F1%2Foriginal.20240318-202454?h=200&w=430&auto=format%2Ccompress&q=75&sharp=10&s=54fe1dd040ee7d61593b399227f411ef"
      )
    ).toBe(
      "https://cdn.evbuc.com/images/722508859/90491413639/1/original.20240318-202454"
    );
  });

  it("handles wrappers with crop/focalpoint params", () => {
    expect(
      upgradeEventbriteImage(
        "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1155614703%2F211395797191%2F1%2Foriginal.20251017-041149?w=512&auto=format%2Ccompress&q=75&sharp=10&rect=0%2C0%2C2160%2C1080&s=15a6038b4bd946a7c661a2cd2199c66d"
      )
    ).toBe(
      "https://cdn.evbuc.com/images/1155614703/211395797191/1/original.20251017-041149"
    );
  });

  it("leaves non-evbuc URLs alone", () => {
    expect(upgradeEventbriteImage("https://cdn.example.com/foo.jpg")).toBe(
      "https://cdn.example.com/foo.jpg"
    );
  });

  it("returns undefined for empty input", () => {
    expect(upgradeEventbriteImage(undefined)).toBeUndefined();
  });
});

describe("stripHtmlDescription", () => {
  it("strips block/inline tags, converts <br> and list items, decodes entities", () => {
    const raw =
      "<p><strong>Powderfinger</strong> reunite for a 25th anniversary set.<br>Doors 6pm</p><ul><li>Drink specials</li><li>Support TBA</li></ul><p>Don&#39;t miss it!</p>";
    const out = stripHtmlDescription(raw);
    expect(out).not.toMatch(/<[^>]+>/);
    expect(out).toContain("Powderfinger reunite for a 25th anniversary set.");
    expect(out).toContain("Doors 6pm");
    expect(out).toContain("• Drink specials");
    expect(out).toContain("• Support TBA");
    expect(out).toContain("Don't miss it!");
  });

  it("leaves plain text unchanged (no-op)", () => {
    expect(stripHtmlDescription("Three-day blues festival at Bowen Hills.")).toBe(
      "Three-day blues festival at Bowen Hills."
    );
  });

  it("returns undefined for undefined/null input", () => {
    expect(stripHtmlDescription(undefined)).toBeUndefined();
    expect(stripHtmlDescription(null)).toBeUndefined();
  });
});
