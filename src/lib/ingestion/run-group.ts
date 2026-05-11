import { revalidatePath } from "next/cache";
import type { SourceAdapter } from "@/types/event";
import { normalise } from "./normaliser";
import { upsertEvents } from "./dedup";

export interface AdapterResult {
  adapter: string;
  created: number;
  updated: number;
  errors: number;
}

async function runAdapter(adapter: SourceAdapter): Promise<AdapterResult> {
  const rawEvents = await adapter.fetch();
  if (rawEvents.length === 0) {
    return { adapter: adapter.name, created: 0, updated: 0, errors: 0 };
  }
  const normalised = rawEvents.map((raw) => normalise(adapter.name, raw));
  const result = await upsertEvents(normalised);
  return {
    adapter: adapter.name,
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  };
}

export async function runAdapterGroup(adapters: SourceAdapter[]) {
  const results = await Promise.allSettled(
    adapters.map((adapter) =>
      runAdapter(adapter).catch((err) => {
        console.error(`[cron/ingest] Adapter "${adapter.name}" failed:`, err);
        return { adapter: adapter.name, created: 0, updated: 0, errors: 1 };
      })
    )
  );

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const adapterResults: AdapterResult[] = [];

  for (const result of results) {
    const r =
      result.status === "fulfilled"
        ? result.value
        : { adapter: "unknown", created: 0, updated: 0, errors: 1 };
    totalCreated += r.created;
    totalUpdated += r.updated;
    totalErrors += r.errors;
    adapterResults.push(r);
  }

  const revalidated: string[] = [];
  if (totalCreated > 0 || totalUpdated > 0) {
    const paths: Array<[string, "page" | "layout"]> = [
      ["/", "page"],
      ["/events", "page"],
      ["/today", "page"],
      ["/events/[slug]", "page"],
      ["/city/[slug]", "page"],
      ["/api/events/calendar-counts", "page"],
    ];
    for (const [path, type] of paths) {
      try {
        revalidatePath(path, type);
        revalidated.push(path);
      } catch (err) {
        console.error(`[cron/ingest] revalidatePath("${path}") failed:`, err);
      }
    }
  }

  return {
    totals: { created: totalCreated, updated: totalUpdated, errors: totalErrors },
    adapters: adapterResults,
    revalidated,
  };
}
