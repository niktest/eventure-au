import type { SourceAdapter, RawEvent } from "@/types/event";

/**
 * Sticky Tickets Public Events API adapter.
 * Uses the Sticky Tickets public events feed designed for event aggregators.
 * Requires STICKY_TICKETS_TOKEN env var.
 * Request token via support@stickytickets.com.au
 * Docs: https://help.stickytickets.com.au/how-to-obtain-a-list-of-all-public-live-events
 */

interface StickyTicketsEvent {
  Id: number;
  Name: string;
  StartDateTime: string;
  EndDateTime: string;
  VenueName: string;
  VenueAddress: string;
  LocationSpecialInstructions: string | null;
  OrganiserName: string;
  OrganisationName: string;
  Phone: string | null;
  Email: string | null;
  Description: string;
  Capacity: number | null;
  Images: Array<{ Url: string; Description: string }>;
  Tickets: Array<{
    Name: string;
    Capacity: number;
    SubTickets: Array<{ Name: string; Price: number; Currency: string }>;
  }>;
}

export class StickyTicketsAdapter implements SourceAdapter {
  readonly name = "stickytickets";

  async fetch(): Promise<RawEvent[]> {
    const token = process.env.STICKY_TICKETS_TOKEN;
    if (!token) {
      console.warn("[stickytickets] STICKY_TICKETS_TOKEN not set, skipping");
      return [];
    }

    const apiUrl = process.env.STICKY_TICKETS_URL ?? "https://www.stickytickets.com.au/api/PublicEvents";
    console.log(`[stickytickets] Fetching public events feed`);

    try {
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "Eventure/1.0 (events aggregator; contact@eventure.com.au)",
        },
      });

      if (!res.ok) {
        console.error(`[stickytickets] API error ${res.status}: ${await res.text()}`);
        return [];
      }

      const data: StickyTicketsEvent[] = await res.json();
      return data
        .filter((e) => isAustralianEvent(e))
        .map(mapEvent);
    } catch (err) {
      console.error("[stickytickets] Fetch failed:", err);
      return [];
    }
  }
}

function isAustralianEvent(e: StickyTicketsEvent): boolean {
  const addr = (e.VenueAddress ?? "").toLowerCase();
  return (
    addr.includes("australia") ||
    addr.includes("qld") ||
    addr.includes("nsw") ||
    addr.includes("vic") ||
    addr.includes("wa") ||
    addr.includes("sa") ||
    addr.includes("tas") ||
    addr.includes("act") ||
    addr.includes("nt") ||
    addr.includes("gold coast") ||
    addr.includes("brisbane") ||
    addr.includes("sydney") ||
    addr.includes("melbourne")
  );
}

function extractCity(address: string): string {
  const lower = address.toLowerCase();
  if (lower.includes("gold coast")) return "Gold Coast";
  if (lower.includes("brisbane")) return "Brisbane";
  if (lower.includes("sydney")) return "Sydney";
  if (lower.includes("melbourne")) return "Melbourne";
  if (lower.includes("perth")) return "Perth";
  if (lower.includes("adelaide")) return "Adelaide";
  if (lower.includes("hobart")) return "Hobart";
  if (lower.includes("darwin")) return "Darwin";
  if (lower.includes("canberra")) return "Canberra";
  return "Gold Coast";
}

function extractState(address: string): string {
  const lower = address.toLowerCase();
  if (lower.includes("qld") || lower.includes("queensland")) return "QLD";
  if (lower.includes("nsw") || lower.includes("new south wales")) return "NSW";
  if (lower.includes("vic") || lower.includes("victoria")) return "VIC";
  if (lower.includes(" wa") || lower.includes("western australia")) return "WA";
  if (lower.includes(" sa") || lower.includes("south australia")) return "SA";
  if (lower.includes("tas") || lower.includes("tasmania")) return "TAS";
  if (lower.includes("act")) return "ACT";
  if (lower.includes(" nt") || lower.includes("northern territory")) return "NT";
  return "QLD";
}

function mapEvent(e: StickyTicketsEvent): RawEvent {
  const allPrices = e.Tickets?.flatMap((t) =>
    t.SubTickets?.map((st) => st.Price).filter((p) => p > 0) ?? []
  ) ?? [];

  const isFree = allPrices.length === 0 || allPrices.every((p) => p === 0);

  return {
    sourceId: String(e.Id),
    name: e.Name,
    description: e.Description ?? undefined,
    startDate: e.StartDateTime,
    endDate: e.EndDateTime ?? undefined,
    imageUrl: e.Images?.[0]?.Url ?? undefined,
    url: `https://www.stickytickets.com.au/app/event/${e.Id}`,
    venueName: e.VenueName ?? undefined,
    venueAddress: e.VenueAddress ?? undefined,
    city: extractCity(e.VenueAddress ?? ""),
    state: extractState(e.VenueAddress ?? ""),
    isFree,
    priceMin: allPrices.length > 0 ? Math.min(...allPrices) : undefined,
    priceMax: allPrices.length > 0 ? Math.max(...allPrices) : undefined,
    ticketUrl: `https://www.stickytickets.com.au/app/event/${e.Id}`,
    ticketProvider: "stickytickets",
    rawData: e,
  };
}
