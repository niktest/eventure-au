/**
 * Backfill: re-run the cross-source dedup pass over the existing upcoming
 * catalogue, marking later-created dupes as draft. Pass --apply to write;
 * otherwise dry-runs and prints the diff. EVE-196.
 */
import { findAndLinkDuplicates } from "@/lib/ingestion/dedup";
import { prisma } from "@/lib/prisma";

async function main() {
  const apply = process.argv.includes("--apply");

  const beforeDraft = await prisma.event.count({
    where: { status: "draft", startDate: { gte: new Date() } },
  });
  console.log(`Before: ${beforeDraft} upcoming events with status=draft`);

  const result = await findAndLinkDuplicates({ dryRun: !apply });
  console.log(
    `findAndLinkDuplicates(${apply ? "apply" : "dryRun"}): scanned=${result.scanned} marked=${result.marked}`
  );

  console.log("\nSamples (kept / draft):");
  for (const s of result.samples) {
    console.log(`  ${s.keptId} → ${s.draftId}  «  ${s.name}`);
  }

  if (apply) {
    const afterDraft = await prisma.event.count({
      where: { status: "draft", startDate: { gte: new Date() } },
    });
    console.log(`\nAfter: ${afterDraft} upcoming events with status=draft`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
