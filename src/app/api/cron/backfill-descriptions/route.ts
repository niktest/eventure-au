import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { backfillDescriptions } from "@/lib/ingestion/description-backfill";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const result = await backfillDescriptions();

  if (result.updated > 0) {
    // Refreshed descriptions show on event detail and listing pages; revalidate
    // the same surfaces the main ingest cron does so the new copy goes live
    // without waiting for the next nightly run.
    for (const path of ["/", "/events", "/today", "/events/[slug]", "/city/[slug]"]) {
      try {
        revalidatePath(path, "page");
      } catch (err) {
        console.error(`[cron/backfill-descriptions] revalidatePath("${path}") failed:`, err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...result,
  });
}
