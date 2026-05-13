/**
 * Backfill `Event.state` rows by reapplying `normaliseState` from the
 * normaliser. Idempotent — safe to re-run.
 *
 * Background: EVE-195 — a snapshot of the events table showed 1,671 rows with
 * `state="Unknown"` and ~350 rows truncated to 2-letter codes (`QL`/`NS`/`VI`).
 * The fix in the normaliser handles all known shapes (full names, ISO prefix,
 * truncations) for new ingests, but existing rows stay wrong until each event
 * is rescraped. This walks the table and rewrites every value once.
 *
 * Run via: `npx tsx scripts/backfill-state-codes.ts` against production
 * (with `DATABASE_URL` set).
 */
import { prisma } from "@/lib/prisma";
import { normaliseState } from "@/lib/ingestion/normaliser";

async function main() {
  const rows = await prisma.event.findMany({
    select: { id: true, state: true, source: true },
  });
  console.log(`[backfill-state] scanning ${rows.length} events`);

  const before = new Map<string, number>();
  const after = new Map<string, number>();
  let changed = 0;
  const updates: Array<{ id: string; state: string }> = [];

  for (const row of rows) {
    before.set(row.state, (before.get(row.state) ?? 0) + 1);
    const normalised = normaliseState(row.state);
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
