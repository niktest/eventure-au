/**
 * Live QC sampling harness.
 *
 * Usage:
 *   npx tsx scripts/qc-sample-events.ts                # every adapter
 *   npx tsx scripts/qc-sample-events.ts --provider humanitix
 *   npx tsx scripts/qc-sample-events.ts --provider humanitix --sample 5
 *
 * The script invokes each adapter's `fetch()` against the real source, takes
 * `--sample` (default 3) events from the head of its output, and runs the
 * shared event-quality validator. It prints a per-provider report and exits
 * non-zero when any sampled event has `error`-severity findings.
 *
 * This is the QC tooling for EVE-197: any time you change an adapter, run
 * this against the affected provider before merging.
 */

import { ADAPTER_GROUPS, isAdapterGroup } from "@/lib/ingestion/groups";
import { assessEventQuality } from "@/lib/ingestion/quality/event-quality";
import type { RawEvent, SourceAdapter } from "@/types/event";

interface Args {
  providers: string[] | null;
  sampleSize: number;
  probeImages: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { providers: null, sampleSize: 3, probeImages: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--provider" || a === "-p") {
      const v = argv[++i];
      args.providers = (args.providers ?? []).concat(v.split(","));
    } else if (a === "--sample" || a === "-n") {
      args.sampleSize = Number.parseInt(argv[++i], 10) || 3;
    } else if (a === "--probe-images") {
      args.probeImages = true;
    } else if (a === "--help" || a === "-h") {
      console.log(
        [
          "qc-sample-events — sample 2–3 events from each provider and assert quality",
          "",
          "Flags:",
          "  --provider, -p <name>   adapter group key (api|ticketmaster|scrapers-venue|humanitix|oztix|scrapers-platform-small|moshtix)",
          "                          or an adapter name (eventbrite, hota, …). Can be passed multiple times or comma-separated.",
          "  --sample, -n <int>      sample size per adapter (default 3)",
          "  --probe-images          HEAD-request imageUrl to flag thumbnail-sized variants (slower, network)",
        ].join("\n")
      );
      process.exit(0);
    }
  }
  return args;
}

function allAdapters(): SourceAdapter[] {
  return Object.values(ADAPTER_GROUPS).flatMap((make) => make());
}

function selectAdapters(filters: string[] | null): SourceAdapter[] {
  if (!filters) return allAdapters();
  const all = allAdapters();
  const wanted = new Set(filters.map((s) => s.toLowerCase()));
  const groupMatches = filters.filter(isAdapterGroup);
  const fromGroups = groupMatches.flatMap((g) => ADAPTER_GROUPS[g]());
  const fromNames = all.filter((a) => wanted.has(a.name.toLowerCase()));
  const seen = new Set<string>();
  return [...fromGroups, ...fromNames].filter((a) => {
    if (seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  });
}

async function probeImageBytes(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    return len ? Number.parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

const MIN_IMAGE_BYTES = 30_000; // ~30KB; smaller than this is almost always a thumb

interface Report {
  provider: string;
  total: number;
  sampleErrors: number;
  sampleWarnings: number;
  sampleDetail: string[];
  fatal?: string;
}

async function sampleProvider(
  adapter: SourceAdapter,
  sampleSize: number,
  probeImages: boolean
): Promise<Report> {
  const report: Report = {
    provider: adapter.name,
    total: 0,
    sampleErrors: 0,
    sampleWarnings: 0,
    sampleDetail: [],
  };

  let events: RawEvent[];
  try {
    events = await adapter.fetch();
  } catch (err) {
    report.fatal = `adapter threw: ${(err as Error).message}`;
    return report;
  }
  report.total = events.length;
  if (events.length === 0) {
    report.fatal = "adapter returned 0 events";
    return report;
  }

  const sample = events.slice(0, sampleSize);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const a = assessEventQuality(e);
    let imageNote = "";
    if (probeImages && e.imageUrl) {
      const bytes = await probeImageBytes(e.imageUrl);
      if (bytes !== null && bytes < MIN_IMAGE_BYTES) {
        a.issues.push({
          field: "imageUrl",
          code: "small_image_bytes",
          severity: "error",
          message: `imageUrl HEAD content-length=${bytes} (<${MIN_IMAGE_BYTES}B) — looks like a thumbnail.`,
        });
        a.errors.push(a.issues[a.issues.length - 1]);
        a.ok = false;
      }
      imageNote = bytes != null ? ` [${bytes}B]` : "";
    }
    report.sampleErrors += a.errors.length;
    report.sampleWarnings += a.warnings.length;
    const status = a.ok ? "OK " : "FAIL";
    report.sampleDetail.push(
      `  [${status}] event[${i}] ${e.name?.slice(0, 60) ?? "<unnamed>"} :: ${e.url ?? e.sourceId ?? "<no-url>"}${imageNote}`
    );
    for (const issue of a.issues) {
      report.sampleDetail.push(
        `      ${issue.severity}: ${issue.field}/${issue.code} — ${issue.message}`
      );
    }
  }
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const adapters = selectAdapters(args.providers);
  if (adapters.length === 0) {
    console.error("No adapters matched the filter:", args.providers);
    process.exit(2);
  }

  console.log(
    `QC sampling ${adapters.length} adapter(s), sample size ${args.sampleSize}${args.probeImages ? " (with image HEAD probe)" : ""}…\n`
  );

  const reports: Report[] = [];
  for (const adapter of adapters) {
    console.log(`--- ${adapter.name} ---`);
    const r = await sampleProvider(adapter, args.sampleSize, args.probeImages);
    reports.push(r);
    if (r.fatal) {
      console.log(`  FATAL: ${r.fatal}`);
    } else {
      console.log(
        `  total events: ${r.total} | sample errors: ${r.sampleErrors} | warnings: ${r.sampleWarnings}`
      );
      for (const line of r.sampleDetail) console.log(line);
    }
    console.log();
  }

  const failed = reports.filter((r) => r.fatal || r.sampleErrors > 0);
  console.log("=== Summary ===");
  for (const r of reports) {
    const status = r.fatal
      ? "FATAL"
      : r.sampleErrors > 0
        ? "FAIL"
        : r.sampleWarnings > 0
          ? "WARN"
          : "OK";
    console.log(
      `  ${status.padEnd(5)} ${r.provider.padEnd(20)} total=${r.total} err=${r.sampleErrors} warn=${r.sampleWarnings}${r.fatal ? `  (${r.fatal})` : ""}`
    );
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length}/${reports.length} adapters failed QC.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
