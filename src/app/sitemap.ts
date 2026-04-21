import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventure.com.au";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let events: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    events = await prisma.event.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
  } catch {
    // DB unavailable at build time
  }

  const eventUrls: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${SITE_URL}/events/${event.slug}`,
    lastModified: event.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const cities = ["gold-coast", "brisbane", "sydney", "melbourne"];
  const cityUrls: MetadataRoute.Sitemap = cities.map((slug) => ({
    url: `${SITE_URL}/city/${slug}`,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/events`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...cityUrls,
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...eventUrls,
  ];
}
