import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Outbound-ticket-click DB sink (EVE-217 redo).
//
// Writes one TicketClick row per outbound CTA click so docs/analytics.md
// dashboards have a real source of truth. Must never block the CTA: on a bad
// payload return 400, but on any DB/runtime failure return 200 so the beacon
// is treated as delivered and the user's navigation completes uninterrupted.

const Payload = z.object({
  eventId: z.string().min(1).max(64).nullable().optional(),
  eventSlug: z.string().min(1).max(200),
  ticketUrl: z.string().url().max(2048),
  source: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    // sendBeacon posts a Blob; some browsers send empty body on aborts.
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = Payload.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { eventId, eventSlug, ticketUrl, source } = parsed.data;

  // Capture nothing personally-identifying. UA + referrer are coarse and
  // already exposed to the partner site we're about to navigate to.
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const referrer = req.headers.get("referer")?.slice(0, 2048) ?? null;

  try {
    await prisma.ticketClick.create({
      data: {
        eventId: eventId ?? null,
        eventSlug,
        ticketUrl,
        source,
        userAgent,
        referrer,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    // DB unreachable / table missing — never break the click. 200 (not 5xx)
    // so the beacon counts as delivered and nothing retries.
    return NextResponse.json({ ok: true, persisted: false });
  }
}
