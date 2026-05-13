import { describe, it, expect } from "vitest";
import { buildIcs, googleCalendarUrl, outlookCalendarUrl, type IcsEventInput } from "./ics";

function makeEvent(overrides: Partial<IcsEventInput> = {}): IcsEventInput {
  return {
    id: "evt_123",
    slug: "summer-fest-2026",
    name: "Summer Fest 2026",
    description: "A weekend of live music, food, and family fun.",
    startDate: new Date("2026-06-15T10:00:00.000Z"),
    endDate: new Date("2026-06-15T22:00:00.000Z"),
    venueName: "Doug Jennings Park",
    venueAddress: "1 Seaworld Dr",
    city: "Gold Coast",
    state: "QLD",
    country: "AU",
    latitude: -27.97,
    longitude: 153.41,
    url: "https://example.org/event",
    ticketUrl: "https://tickets.example.org/evt_123",
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("buildIcs", () => {
  it("produces a wrapped VCALENDAR with required fields", () => {
    const ics = buildIcs(makeEvent(), "https://festlio.com");
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Festlio//Events//EN");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
  });

  it("formats DTSTART/DTEND as UTC and includes the event UID", () => {
    const ics = buildIcs(makeEvent(), "https://festlio.com");
    expect(ics).toContain("DTSTART:20260615T100000Z");
    expect(ics).toContain("DTEND:20260615T220000Z");
    expect(ics).toContain("UID:evt_123@festlio.com");
  });

  it("escapes commas, semicolons, and newlines in text values", () => {
    const ics = buildIcs(
      makeEvent({
        name: "Beer, Wine; Cheese",
        description: "Line one\nLine two; with semis, and commas.",
      }),
      "https://festlio.com",
    );
    expect(ics).toContain("SUMMARY:Beer\\, Wine\\; Cheese");
    expect(ics).toContain("Line one\\nLine two\\; with semis\\, and commas.");
  });

  it("defaults to a 2-hour duration when endDate is missing", () => {
    const ics = buildIcs(makeEvent({ endDate: null }), "https://festlio.com");
    expect(ics).toContain("DTSTART:20260615T100000Z");
    expect(ics).toContain("DTEND:20260615T120000Z");
  });

  it("includes GEO when coordinates are present", () => {
    const ics = buildIcs(makeEvent(), "https://festlio.com");
    expect(ics).toContain("GEO:-27.97;153.41");
  });

  it("uses CRLF line endings", () => {
    const ics = buildIcs(makeEvent(), "https://festlio.com");
    // Every newline in the output should be \r\n
    expect(ics).not.toMatch(/[^\r]\n/);
  });
});

describe("googleCalendarUrl", () => {
  it("encodes the event into a Google Calendar TEMPLATE link", () => {
    const url = googleCalendarUrl(makeEvent(), "https://festlio.com");
    const parsed = new URL(url);
    expect(parsed.host).toBe("calendar.google.com");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Summer Fest 2026");
    expect(parsed.searchParams.get("dates")).toBe("20260615T100000Z/20260615T220000Z");
    expect(parsed.searchParams.get("location")).toContain("Doug Jennings Park");
  });
});

describe("outlookCalendarUrl", () => {
  it("encodes the event into an Outlook compose link", () => {
    const url = outlookCalendarUrl(makeEvent(), "https://festlio.com");
    const parsed = new URL(url);
    expect(parsed.host).toBe("outlook.live.com");
    expect(parsed.searchParams.get("rru")).toBe("addevent");
    expect(parsed.searchParams.get("subject")).toBe("Summer Fest 2026");
    expect(parsed.searchParams.get("startdt")).toBe("2026-06-15T10:00:00.000Z");
    expect(parsed.searchParams.get("enddt")).toBe("2026-06-15T22:00:00.000Z");
  });
});
