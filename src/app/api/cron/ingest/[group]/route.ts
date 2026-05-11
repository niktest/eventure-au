import { NextRequest, NextResponse } from "next/server";
import { ADAPTER_GROUPS, isAdapterGroup } from "@/lib/ingestion/groups";
import { runAdapterGroup } from "@/lib/ingestion/run-group";

export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { group } = await params;
  if (!isAdapterGroup(group)) {
    return NextResponse.json(
      { error: `Unknown adapter group "${group}"`, known: Object.keys(ADAPTER_GROUPS) },
      { status: 404 }
    );
  }

  const adapters = ADAPTER_GROUPS[group]();
  const startedAt = new Date().toISOString();
  const result = await runAdapterGroup(adapters);

  return NextResponse.json({
    ok: true,
    group,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...result,
  });
}
