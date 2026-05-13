/**
 * Backfill `Event.state` rows by reapplying `deriveState` from the normaliser.
 * Idempotent — safe to re-run.
 *
 * Background: EVE-195 added `normaliseState` to centralise state-code mapping;
 * a one-shot backfill rewrote ~350 truncated codes. EVE-220 extended the
 * normaliser with venue-address postcode and city fallbacks (the 1,995 prod
 * rows with state="Unknown" almost all had recoverable signals in `city` or
 * `venueAddress`). This rerun picks up the EVE-220 fallback for those rows
 * plus any EVE-195 truncations that snuck back in (`al`/`QL`/`NS`/`VI`/`AC`).
 *
 * Run via: `npx tsx scripts/backfill-state-codes.ts` against production
 * (with `DATABASE_URL` set). Set `DRY_RUN=1` to print the diff without writing.
 */
import { prisma } from "@/lib/prisma";
import { deriveState } from "@/lib/ingestion/normaliser";

async function main() {
  const rows = await prisma.event.findMany({
    select: { id: true, state: true, city: true, venueAddress: true, venueName: true, source: true },
  });
  console.log(`[backfill-state] scanning ${rows.length} events`);

  const before = new Map<string, number>();
  const after = new Map<string, number>();
  let changed = 0;
  const updates: Array<{ id: string; state: string }> = [];

  for (const row of rows) {
    before.set(row.state, (before.get(row.state) ?? 0) + 1);
    const normalised = deriveState({
      state: row.state,
      city: row.city,
      venueAddress: row.venueAddress,
      venueName: row.venueName,
    });
    after.set(normalised, (after.get(normalised) ?? 0) + 1);
    if (normalised !== row.state) {
      updates.push({ id: row.id, state: normalised });
      changed++;
    }
  }

  console.log("\n[backfill-state] BEFORE:");
  for (const [s, n] of [...before.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(20)} ${n}`);
  }
  console.log("\n[backfill-state] AFTER:");
  for (const [s, n] of [...after.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(20)} ${n}`);
  }
  console.log(`\n[backfill-state] ${changed} rows need updating`);

  if (process.env.DRY_RUN === "1") {
    console.log("[backfill-state] DRY_RUN=1 — not writing");
    return;
  }

  // Group by target state to do one updateMany per state instead of N updates.
  const byState = new Map<string, string[]>();
  for (const u of updates) {
    const list = byState.get(u.state) ?? [];
    list.push(u.id);
    byState.set(u.state, list);
  }
  for (const [state, ids] of byState.entries()) {
    const res = await prisma.event.updateMany({
      where: { id: { in: ids } },
      data: { state },
    });
    console.log(`[backfill-state] -> ${state}: updated ${res.count}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
