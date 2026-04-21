import type { SourceAdapter } from "@/types/event";
import { normalise } from "./normaliser";
import { upsertEvents } from "./dedup";
import { ExampleAdapter } from "./adapters/example";

/**
 * Registry of all source adapters. Add new adapters here as they are built.
 */
const adapters: SourceAdapter[] = [
  new ExampleAdapter(),
  // Future: new EventbriteAdapter(),
  // Future: new DestinationGCAdapter(),
  // Future: new HOTAAdapter(),
];

async function run() {
  console.log(`[ingestion] Starting run at ${new Date().toISOString()}`);
  console.log(`[ingestion] ${adapters.length} adapter(s) registered\n`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const adapter of adapters) {
    console.log(`[ingestion] Fetching from "${adapter.name}"...`);
    try {
      const rawEvents = await adapter.fetch();
      console.log(`[ingestion]   → ${rawEvents.length} raw event(s)`);

      const normalised = rawEvents.map((raw) => normalise(adapter.name, raw));
      const result = await upsertEvents(normalised);

      totalCreated += result.created;
      totalUpdated += result.updated;
      totalErrors += result.errors;

      console.log(
        `[ingestion]   → created=${result.created} updated=${result.updated} errors=${result.errors}`
      );
    } catch (err) {
      console.error(`[ingestion] Adapter "${adapter.name}" failed:`, err);
      totalErrors++;
    }
  }

  console.log(
    `\n[ingestion] Done. created=${totalCreated} updated=${totalUpdated} errors=${totalErrors}`
  );
}

run().catch((err) => {
  console.error("[ingestion] Fatal error:", err);
  process.exit(1);
});
