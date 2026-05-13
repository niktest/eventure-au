import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/calendar/ics";
import { getSiteUrl } from "@/lib/seo/site-url";

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status === "draft") {
    return new Response("Not Found", { status: 404 });
  }

  const body = buildIcs(event, getSiteUrl());
  const filename = `${slug}.ics`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
