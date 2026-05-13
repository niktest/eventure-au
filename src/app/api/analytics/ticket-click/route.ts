import { NextResponse, type NextRequest } from "next/server";

// Outbound-ticket-click telemetry endpoint.
//
// We don't have a first-class analytics surface wired up yet — see follow-up
// issue. Until then, this endpoint just records clicks to stdout where they
// can be inspected via Vercel logs or scraped into a dashboard. The shape is
// stable so swapping in a real backend later (PostHog / Plausible / our own
// table) is a pure replacement of this handler.

type Payload = {
  eventId?: unknown;
  source?: unknown;
  url?: unknown;
};

export async function POST(req: NextRequest) {
  let body: Payload = {};
  try {
    body = (await req.json()) as Payload;
  } catch {
    // sendBeacon posts blob; if JSON parse fails fall through with empty body.
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : null;
  const source = typeof body.source === "string" ? body.source : null;
  const url = typeof body.url === "string" ? body.url : null;
  if (!eventId || !url) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Structured single-line log so it's easy to grep / pipe.
  console.log(
    JSON.stringify({
      kind: "ticket-click",
      eventId,
      source,
      url,
      ts: new Date().toISOString(),
    }),
  );
  return NextResponse.json({ ok: true });
}
