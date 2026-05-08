/**
 * Backfill stale `imageUrl` rows by reapplying the upgrade* helpers from
 * `src/lib/ingestion/utils/scrape-helpers`. Idempotent — safe to re-run.
 *
 * Background: when we add a new image-quality helper (or update an existing
 * one), only newly-scraped rows pick it up. Events that haven't been
 * re-scraped since the change keep the stale URL forever. This script walks
 * the DB and applies every helper to every row, updating only the rows where
 * the helper actually changes the URL.
 *
 * Run via: `npx tsx scripts/backfill-image-upgrades.ts` against production
 * (with `DATABASE_URL` set).
 */
import { prisma } from "@/lib/prisma";
import {
  upgradeHotaImage,
  upgradeMoshtixImage,
  upgradeStylelabsImage,
  upgradeWordpressThumbnail,
} from "@/lib/ingestion/utils/scrape-helpers";

interface Rule {
  label: string;
  source: string;
  upgrade: (url: string) => string | undefined;
}

const RULES: Rule[] = [
  { label: "destinationgc Stylelabs", source: "destinationgc", upgrade: upgradeStylelabsImage },
  { label: "hota /generated/<width>w-", source: "hota", upgrade: upgradeHotaImage },
  { label: "sandstonepoint WP -WIDTHxHEIGHT", source: "sandstonepoint", upgrade: upgradeWordpressThumbnail },
  { label: "moshtix xWxH", source: "moshtix", upgrade: upgradeMoshtixImage },
];

async function main() {
  let totalChanged = 0;
  for (const rule of RULES) {
    const rows = await prisma.event.findMany({
      where: { source: rule.source, imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    });
    let changed = 0;
    for (const row of rows) {
      if (!row.imageUrl) continue;
      const next = rule.upgrade(row.imageUrl);
      if (next && next !== row.imageUrl) {
        await prisma.event.update({ where: { id: row.id }, data: { imageUrl: next } });
        changed++;
      }
    }
    console.log(`${rule.label}: examined=${rows.length}, updated=${changed}`);
    totalChanged += changed;
  }
  console.log(`\nTotal rows updated: ${totalChanged}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
