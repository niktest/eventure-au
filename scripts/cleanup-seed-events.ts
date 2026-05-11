/**
 * Back up and delete every row in `events` with `source = "seed"`.
 *
 * These are placeholder demo events from the original `prisma/seed.ts` and
 * have been authorised for deletion by the board on EVE-181 / EVE-182.
 *
 * Behaviour:
 *  1. Counts seed rows up-front and prints before-counts (total + by source).
 *  2. Writes a full JSON snapshot of every seed row to
 *     `backups/seed-events-<ISO-timestamp>.json` BEFORE any delete.
 *  3. Deletes the rows in a single transaction, then re-counts.
 *  4. Aborts (no delete, no backup file) if zero seed rows are found.
 *
 * Idempotent: re-running after success is a no-op (no rows, no backup written).
 *
 * Run with prod credentials:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/cleanup-seed-events.ts
 *
 * Add --dry-run to print counts + write the backup file without deleting.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

const SEED_SOURCE = "seed";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const before = {
    total: await prisma.event.count(),
    seed: await prisma.event.count({ where: { source: SEED_SOURCE } }),
    bySource: await prisma.event.groupBy({
      by: ["source"],
      _count: { _all: true },
      orderBy: { source: "asc" },
    }),
  };

  console.log("Before:", JSON.stringify(before, null, 2));

  if (before.seed === 0) {
    console.log(`\nNo rows with source='${SEED_SOURCE}'. Nothing to do.`);
    return;
  }

  const rows = await prisma.event.findMany({ where: { source: SEED_SOURCE } });

  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `seed-events-${timestamp}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify({ takenAt: new Date().toISOString(), count: rows.length, rows }, null, 2),
  );
  console.log(`\nBackup written: ${backupPath} (${rows.length} rows)`);

  if (dryRun) {
    console.log("\n--dry-run: skipping delete.");
    return;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const ids = rows.map((r) => r.id);
    const result = await tx.event.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  });

  const after = {
    total: await prisma.event.count(),
    seed: await prisma.event.count({ where: { source: SEED_SOURCE } }),
    bySource: await prisma.event.groupBy({
      by: ["source"],
      _count: { _all: true },
      orderBy: { source: "asc" },
    }),
  };

  console.log(`\nDeleted ${deleted} rows.`);
  console.log("After:", JSON.stringify(after, null, 2));

  if (after.seed !== 0) {
    throw new Error(`Post-condition failed: ${after.seed} seed rows still present`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
