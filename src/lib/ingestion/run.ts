import type { SourceAdapter } from "@/types/event";
import { normalise } from "./normaliser";
import { upsertEvents } from "./dedup";

// API adapters
import { EventbriteAdapter } from "./adapters/eventbrite";
import { TicketmasterAdapter } from "./adapters/ticketmaster";
import { MeetupAdapter } from "./adapters/meetup";
import { BandsintownAdapter } from "./adapters/bandsintown";

// Scraper adapters (P1 Gold Coast)
import { DestinationGCAdapter } from "./adapters/destination-gc";
import { CityOfGCAdapter } from "./adapters/city-of-gc";
import { HOTAAdapter } from "./adapters/hota";
import { StarGCAdapter } from "./adapters/star-gc";
import { MiamiMarkettaAdapter } from "./adapters/miami-marketta";
import { SandstonePointAdapter } from "./adapters/sandstone-point";
import { HumanitixAdapter } from "./adapters/humanitix";
import { MoshtixAdapter } from "./adapters/moshtix";
import { TryBookingAdapter } from "./adapters/trybooking";

// P2 API adapters (national expansion)
import { EventfindaAdapter } from "./adapters/eventfinda";
import { StickyTicketsAdapter } from "./adapters/sticky-tickets";

// P2 Scraper adapters (national expansion)
import { OztixAdapter } from "./adapters/oztix";
import { MegatixAdapter } from "./adapters/megatix";
import { VisitBrisbaneAdapter } from "./adapters/visit-brisbane";

// Example adapter (for dev/testing)
import { ExampleAdapter } from "./adapters/example";

/**
 * Registry of all source adapters.
 * API adapters first (fastest, most reliable), then scrapers.
 */
const adapters: SourceAdapter[] = [
  // API-based (P1)
  new EventbriteAdapter(),
  new TicketmasterAdapter(),
  new MeetupAdapter(),
  new BandsintownAdapter(),

  // Scraper-based (P1 Gold Coast)
  new DestinationGCAdapter(),
  new CityOfGCAdapter(),
  new HOTAAdapter(),
  new StarGCAdapter(),
  new MiamiMarkettaAdapter(),
  new SandstonePointAdapter(),
  new HumanitixAdapter(),
  new MoshtixAdapter(),
  new TryBookingAdapter(),

  // P2 API-based (national expansion)
  new EventfindaAdapter(),
  new StickyTicketsAdapter(),

  // P2 Scraper-based (national expansion)
  new OztixAdapter(),
  new MegatixAdapter(),
  new VisitBrisbaneAdapter(),

  // Dev/test
  new ExampleAdapter(),
];

async function run() {
  console.log(`[ingestion] Starting run at ${new Date().toISOString()}`);
  console.log(`[ingestion] ${adapters.length} adapter(s) registered\n`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let totalDupsLinked = 0;

  for (const adapter of adapters) {
    console.log(`[ingestion] Fetching from "${adapter.name}"...`);
    try {
      const rawEvents = await adapter.fetch();
      console.log(`[ingestion]   -> ${rawEvents.length} raw event(s)`);

      if (rawEvents.length === 0) continue;

      const normalised = rawEvents.map((raw) => normalise(adapter.name, raw));
      const result = await upsertEvents(normalised);

      totalCreated += result.created;
      totalUpdated += result.updated;
      totalErrors += result.errors;
      totalDupsLinked += result.dupsLinked;

      console.log(
        `[ingestion]   -> created=${result.created} updated=${result.updated} errors=${result.errors} dupsLinked=${result.dupsLinked}`
      );
    } catch (err) {
      console.error(`[ingestion] Adapter "${adapter.name}" failed:`, err);
      totalErrors++;
    }
  }

  console.log(
    `\n[ingestion] Done. created=${totalCreated} updated=${totalUpdated} errors=${totalErrors} dupsLinked=${totalDupsLinked}`
  );
}

run().catch((err) => {
  console.error("[ingestion] Fatal error:", err);
  process.exit(1);
});
