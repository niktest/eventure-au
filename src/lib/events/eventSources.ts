// Source/provenance metadata for ticketing platforms and aggregators we ingest.
// Used by <TicketCTA> and any other surface that needs to render "Listed via X"
// attribution. Keep labels short — they show up inline on cards.

export type EventSourceMeta = {
  label: string;
  // Type of source — drives wording ("Get tickets" vs "More info") and whether
  // we treat the outbound link as a ticket sale or general info link.
  kind: "ticketing" | "venue" | "aggregator" | "community";
};

const SOURCES: Record<string, EventSourceMeta> = {
  eventbrite: { label: "Eventbrite", kind: "ticketing" },
  humanitix: { label: "Humanitix", kind: "ticketing" },
  moshtix: { label: "Moshtix", kind: "ticketing" },
  megatix: { label: "Megatix", kind: "ticketing" },
  ticketmaster: { label: "Ticketmaster", kind: "ticketing" },
  meetup: { label: "Meetup", kind: "community" },
  hota: { label: "HOTA", kind: "venue" },
  destinationgc: { label: "Destination Gold Coast", kind: "aggregator" },
  "city-of-gc": { label: "City of Gold Coast", kind: "aggregator" },
  "sandstone-point": { label: "Sandstone Point Hotel", kind: "venue" },
  star: { label: "The Star Gold Coast", kind: "venue" },
};

export function eventSourceMeta(source: string | null | undefined): EventSourceMeta | null {
  if (!source) return null;
  const known = SOURCES[source];
  if (known) return known;
  // Unknown source — fall back to a humanised label and treat as an aggregator
  // so we don't misrepresent it as a ticketing partner.
  return {
    label: source.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    kind: "aggregator",
  };
}
