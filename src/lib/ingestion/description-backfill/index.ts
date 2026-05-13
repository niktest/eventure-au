import { prisma } from "@/lib/prisma";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { DESCRIPTION_PARSERS } from "./parsers";

/**
 * Description backfill (EVE-200).
 *
 * Humanitix/Moshtix/Megatix expose no `description` field in their listing
 * APIs, so the main ingestion cron leaves those events with `description =
 * NULL`. Fetching ~5,000 detail pages inside the nightly window would push
 * each cron group past the 300s Vercel cap; instead we walk a bounded batch
 * per run from a *separate* cron and let coverage build up over a few nights.
 *
 * Rows are picked by `id ASC` filtered on `description IS NULL` — successful
 * rows naturally exit the queue (no longer null), and failed rows are
 * retried on subsequent runs. The dedup upsert is patched to preserve
 * existing descriptions when the listing payload doesn't carry one, so a
 * backfilled row isn't reset to null by the next nightly cron.
 */

const BACKFILL_SOURCES = Object.keys(DESCRIPTION_PARSERS);

// At ~800ms/request and concurrency 16, 1500 rows finishes in ~75s — well
// inside the 300s Vercel cap with headroom for DB updates. Covers ~5k events
// across the three sources in ~4 nights once parse-success-rate kicks in.
const DEFAULT_BATCH_SIZE = 1500;
const DEFAULT_CONCURRENCY = 16;
const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;

export interface BackfillOptions {
  batchSize?: number;
  concurrency?: number;
  // Injected for tests / scripts. Production uses global fetch.
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface BackfillResult {
  scanned: number;
  updated: number;
  emptyParse: number;
  fetchErrors: number;
  perSource: Record<string, { scanned: number; updated: number }>;
}

interface Candidate {
  id: string;
  source: string;
  url: string;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

export async function backfillDescriptions(
  options: BackfillOptions = {}
): Promise<BackfillResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ? options.now() : new Date();

  // Only fetch upcoming events — past ones aren't worth the request budget.
  // `id ASC` is stable across runs; once a row's description is filled it
  // drops out of the null-filter so the runner walks forward over time.
  const candidates = (await prisma.event.findMany({
    where: {
      description: null,
      source: { in: BACKFILL_SOURCES },
      url: { not: null },
      startDate: { gte: now },
    },
    orderBy: { id: "asc" },
    take: batchSize,
    select: { id: true, source: true, url: true },
  })) as Array<{ id: string; source: string; url: string | null }>;

  const queue: Candidate[] = candidates
    .filter((c): c is Candidate => typeof c.url === "string")
    .map((c) => ({ id: c.id, source: c.source, url: c.url }));

  const result: BackfillResult = {
    scanned: queue.length,
    updated: 0,
    emptyParse: 0,
    fetchErrors: 0,
    perSource: Object.fromEntries(
      BACKFILL_SOURCES.map((s) => [s, { scanned: 0, updated: 0 }])
    ) as BackfillResult["perSource"],
  };

  for (const c of queue) result.perSource[c.source].scanned++;

  await runWithConcurrency(queue, concurrency, async (cand) => {
    const parser = DESCRIPTION_PARSERS[cand.source];
    if (!parser) return;

    let body: string;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
      try {
        const res = await fetchImpl(cand.url, {
          headers: { "User-Agent": SCRAPER_USER_AGENT, Accept: "text/html" },
          signal: controller.signal,
        });
        if (!res.ok) {
          result.fetchErrors++;
          return;
        }
        body = await res.text();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      console.error(`[backfill-descriptions] fetch failed for ${cand.url}:`, err);
      result.fetchErrors++;
      return;
    }

    const description = parser(body);
    if (!description) {
      result.emptyParse++;
      return;
    }

    await prisma.event.update({
      where: { id: cand.id },
      data: { description },
    });
    result.updated++;
    result.perSource[cand.source].updated++;
  });

  return result;
}
