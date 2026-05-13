import { backfillDescriptions } from "@/lib/ingestion/description-backfill";

async function main() {
  const batchSize = process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE, 10) : undefined;
  const concurrency = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : undefined;
  const t0 = Date.now();
  const result = await backfillDescriptions({ batchSize, concurrency });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[backfill-descriptions] done in ${elapsed}s`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
