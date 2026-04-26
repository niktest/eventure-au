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

  let threads: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    threads = await prisma.thread.findMany({
      where: { hiddenAt: null, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
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

  const threadUrls: MetadataRoute.Sitemap = threads.map((thread) => ({
    url: `${SITE_URL}/discussions/${thread.slug}`,
    lastModified: thread.updatedAt,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const now = new Date().toISOString();

  const cities = ["gold-coast", "brisbane", "sydney", "melbourne"];
  const cityUrls: MetadataRoute.Sitemap = cities.map((slug) => ({
    url: `${SITE_URL}/city/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/events`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/today`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...cityUrls,
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/community`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/discussions`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...eventUrls,
    ...threadUrls,
  ];
}
