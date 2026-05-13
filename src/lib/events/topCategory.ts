import { prisma } from "@/lib/prisma";

/**
 * Prisma enum → homepage chip mapping. Only enums that map cleanly to a
 * single homepage slug appear here; ambiguous values (e.g. OTHER, MARKETS)
 * fall through to null so we don't surface a category the chip row hides.
 */
const ENUM_TO_HOMEPAGE: Record<string, { slug: string; label: string }> = {
  MUSIC: { slug: "music", label: "Music" },
  FAMILY: { slug: "family", label: "Family" },
  SPORTS: { slug: "sport", label: "Sport" },
  FESTIVAL: { slug: "festivals", label: "Festivals" },
  ARTS: { slug: "exhibitions", label: "Exhibitions" },
  COMMUNITY: { slug: "cultural-community", label: "Cultural Community" },
};

/**
 * Resolve the most popular upcoming category for a city (or globally when
 * `cityLabel` is null). Returns `null` when there is nothing useful to
 * recommend so the caller can skip the suggestion. Safe to call from
 * server components — swallows DB errors.
 */
export async function getTopCategoryForCity(
  cityLabel: string | null,
): Promise<{ slug: string; label: string } | null> {
  try {
    const rows = await prisma.event.groupBy({
      by: ["category"],
      where: {
        status: "published",
        startDate: { gte: new Date() },
        ...(cityLabel ? { city: cityLabel } : {}),
      },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 5,
    });
    for (const row of rows) {
      const mapped = ENUM_TO_HOMEPAGE[row.category as unknown as string];
      if (mapped) return mapped;
    }
    return null;
  } catch {
    return null;
  }
}
