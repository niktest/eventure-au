import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ events: [] });

  try {
    const events = await prisma.event.findMany({
      where: {
        status: "published",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { venueName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        startDate: true,
        endDate: true,
        city: true,
        imageUrl: true,
        venueName: true,
      },
      orderBy: [{ startDate: "asc" }],
      take: 8,
    });
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        city: e.city,
        imageUrl: e.imageUrl,
        venueName: e.venueName,
      })),
    });
  } catch (err) {
    console.error("[events:search]", err);
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
