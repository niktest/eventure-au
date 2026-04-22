import { NextRequest, NextResponse } from "next/server";
import type { SourceAdapter } from "@/types/event";
import { normalise } from "@/lib/ingestion/normaliser";
import { upsertEvents } from "@/lib/ingestion/dedup";

// API adapters
import { EventbriteAdapter } from "@/lib/ingestion/adapters/eventbrite";
import { TicketmasterAdapter } from "@/lib/ingestion/adapters/ticketmaster";
import { MeetupAdapter } from "@/lib/ingestion/adapters/meetup";
import { BandsintownAdapter } from "@/lib/ingestion/adapters/bandsintown";

// Scraper adapters (P1 — venue-specific, Gold Coast)
import { DestinationGCAdapter } from "@/lib/ingestion/adapters/destination-gc";
import { CityOfGCAdapter } from "@/lib/ingestion/adapters/city-of-gc";
import { HOTAAdapter } from "@/lib/ingestion/adapters/hota";
import { StarGCAdapter } from "@/lib/ingestion/adapters/star-gc";
import { MiamiMarkettaAdapter } from "@/lib/ingestion/adapters/miami-marketta";
import { SandstonePointAdapter } from "@/lib/ingestion/adapters/sandstone-point";

// Scraper adapters (AU-wide platform scrapers)
import { HumanitixAdapter } from "@/lib/ingestion/adapters/humanitix";
import { MoshtixAdapter } from "@/lib/ingestion/adapters/moshtix";
import { TryBookingAdapter } from "@/lib/ingestion/adapters/trybooking";

// P2 API adapters (national expansion)
import { EventfindaAdapter } from "@/lib/ingestion/adapters/eventfinda";
import { StickyTicketsAdapter } from "@/lib/ingestion/adapters/sticky-tickets";

// P2 Scraper adapters (national expansion)
import { OztixAdapter } from "@/lib/ingestion/adapters/oztix";
import { MegatixAdapter } from "@/lib/ingestion/adapters/megatix";
import { VisitBrisbaneAdapter } from "@/lib/ingestion/adapters/visit-brisbane";

const adapters: SourceAdapter[] = [
  // API-based (AU-wide)
  new EventbriteAdapter(),
  new TicketmasterAdapter(),
  new MeetupAdapter(),
  new BandsintownAdapter(),
  new EventfindaAdapter(),
  new StickyTicketsAdapter(),

  // Venue-specific scrapers (Gold Coast)
  new DestinationGCAdapter(),
  new CityOfGCAdapter(),
  new HOTAAdapter(),
  new StarGCAdapter(),
  new MiamiMarkettaAdapter(),
  new SandstonePointAdapter(),

  // Platform scrapers (AU-wide)
  new HumanitixAdapter(),
  new MoshtixAdapter(),
  new TryBookingAdapter(),
  new OztixAdapter(),
  new MegatixAdapter(),
  new VisitBrisbaneAdapter(),
];

export const maxDuration = 300; // 5 min max for Vercel Pro

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret to prevent unauthorised triggers
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const adapterResults: Array<{
    adapter: string;
    created: number;
    updated: number;
    errors: number;
  }> = [];

  for (const adapter of adapters) {
    try {
      const rawEvents = await adapter.fetch();
      if (rawEvents.length === 0) {
        adapterResults.push({ adapter: adapter.name, created: 0, updated: 0, errors: 0 });
        continue;
      }

      const normalised = rawEvents.map((raw) => normalise(adapter.name, raw));
      const result = await upsertEvents(normalised);

      totalCreated += result.created;
      totalUpdated += result.updated;
      totalErrors += result.errors;

      adapterResults.push({
        adapter: adapter.name,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
      });
    } catch (err) {
      totalErrors++;
      adapterResults.push({
        adapter: adapter.name,
        created: 0,
        updated: 0,
        errors: 1,
      });
      console.error(`[cron/ingest] Adapter "${adapter.name}" failed:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    totals: { created: totalCreated, updated: totalUpdated, errors: totalErrors },
    adapters: adapterResults,
  });
}
