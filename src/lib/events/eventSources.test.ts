import { describe, it, expect } from "vitest";
import { eventSourceMeta } from "./eventSources";

describe("eventSourceMeta", () => {
  it("returns null for empty source", () => {
    expect(eventSourceMeta(null)).toBeNull();
    expect(eventSourceMeta(undefined)).toBeNull();
    expect(eventSourceMeta("")).toBeNull();
  });

  it("maps known ticketing platforms with friendly labels", () => {
    expect(eventSourceMeta("humanitix")).toEqual({
      label: "Humanitix",
      kind: "ticketing",
    });
    expect(eventSourceMeta("ticketmaster")).toEqual({
      label: "Ticketmaster",
      kind: "ticketing",
    });
  });

  it("classifies venue and aggregator sources distinctly", () => {
    expect(eventSourceMeta("hota")?.kind).toBe("venue");
    expect(eventSourceMeta("destinationgc")?.kind).toBe("aggregator");
    expect(eventSourceMeta("meetup")?.kind).toBe("community");
  });

  it("humanises unknown sources and treats them as aggregators", () => {
    expect(eventSourceMeta("brisbane-times")).toEqual({
      label: "Brisbane Times",
      kind: "aggregator",
    });
  });
});
