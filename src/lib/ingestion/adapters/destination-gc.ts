import * as cheerio from "cheerio";
import type { EventCategory, RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { extractJsonLdEvents } from "../utils/extract-json-ld";
import { ensureHttps, parseHumanDate, resolveUrl } from "../utils/scrape-helpers";

const SOURCE = "destinationgc";

// Experience Gold Coast (operated by Destination Gold Coast) splits its
// event listings across category pages. The legacy /things-to-do/events
// path 404s; the live surface is /events/<category>.
const CATEGORIES: ReadonlyArray<{ slug: string; category: EventCategory }> = [
  { slug: "entertainment", category: "ARTS" },
  { slug: "music", category: "MUSIC" },
  { slug: "sports", category: "SPORTS" },
  { slug: "food-and-drink", category: "FOOD_DRINK" },
  { slug: "arts-and-culture", category: "ARTS" },
  { slug: "classes-and-workshops", category: "COMMUNITY" },
  { slug: "our-events", category: "OTHER" },
];

/**
 * Experience Gold Coast — experiencegoldcoast.com/events/<category>
 *
 * Re-enabled per EVE-167. The replacement events surface lives at
 * /events/<category> (not the legacy /things-to-do/events path which
 * still 404s). Each category page is server-rendered HTML with a
 * `.dgc-listing ul li` event card grid: title in `<h3>`, date text
 * in the first `<h2><span>`, image and detail link in `<a href="/events/...">`.
 */
export class DestinationGCAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl =
      process.env.EXPERIENCE_GC_URL ?? "https://experiencegoldcoast.com";
    console.log(`[destinationgc] Scraping ${baseUrl}/events/* across ${CATEGORIES.length} categories`);

    const seen = new Set<string>();
    const all: RawEvent[] = [];

    const results = await Promise.allSettled(
      CATEGORIES.map(async ({ slug, category }) => {
        const target = `${baseUrl}/events/${slug}`;
        const res = await fetch(target, {
          headers: { "User-Agent": SCRAPER_USER_AGENT },
        });
        if (!res.ok) {
          console.error(`[destinationgc] HTTP ${res.status} for ${slug}`);
          return [] as RawEvent[];
        }
        const html = await res.text();

        // Schema.org may land on category pages later; check first.
        const jsonLd = extractJsonLdEvents(html, {
          sourceIdPrefix: `${SOURCE}-${slug}`,
          city: "Gold Coast",
          state: "QLD",
          category,
        });
        if (jsonLd.length > 0) return jsonLd;

        return parseExperienceGCCards(html, baseUrl, category);
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled") {
        console.error("[destinationgc] Category fetch failed:", r.reason);
        continue;
      }
      for (const event of r.value) {
        const key = event.url ?? event.sourceId;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(event);
      }
    }

    if (all.length === 0) {
      console.log("[destinationgc] HTML parser found no event cards (selectors may have drifted)");
    }
    return all;
  }
}

function parseExperienceGCCards(
  html: string,
  baseUrl: string,
  category: EventCategory
): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $(".dgc-listing li").each((_, el) => {
    const $el = $(el);
    const detailHref = $el
      .find('a[href^="/events/"]')
      .first()
      .attr("href");
    const url = resolveUrl(detailHref, baseUrl);
    if (!url) return;

    const name = $el.find(".desc h3").first().text().trim();
    if (!name) return;

    const dateText = $el.find(".desc h2 span").first().text().trim();
    const dates = parseExperienceGCDate(dateText);
    if (!dates) return;

    const imageRaw = $el.find(".img-cont img").first().attr("src");
    const description = $el.find(".event-desc").first().text().trim() || undefined;
    const ticketUrl =
      $el.find("a.book-now").first().attr("href") ?? undefined;

    events.push({
      sourceId: url,
      name,
      description,
      startDate: dates.start,
      endDate: dates.end,
      imageUrl: ensureHttps(resolveUrl(imageRaw, baseUrl)),
      url,
      ticketUrl,
      city: "Gold Coast",
      state: "QLD",
      category,
    });
  });

  return events;
}

interface DateRange {
  start: Date;
  end?: Date;
}

// Experience GC date strings come in a few flavours:
//   "16 May 2026"
//   "16 May 2026 - 17 May 2026"
//   "From now until 16 May 2026"      -> ongoing; start = today
//   "Saturday (Weekly)"               -> recurring, no anchor date; skip
export function parseExperienceGCDate(
  text: string,
  now: Date = new Date()
): DateRange | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();

  const ongoing = cleaned.match(/^From now until\s+(.+)$/i);
  if (ongoing) {
    const end = parseHumanDate(ongoing[1], { now, preferFuture: true });
    if (!end) return null;
    return { start: now, end };
  }

  const range = cleaned.split(/\s+-\s+/);
  if (range.length === 2) {
    const start = parseHumanDate(range[0], { now, preferFuture: true });
    if (!start) return null;
    const end = parseHumanDate(range[1], { now, preferFuture: true });
    return end ? { start, end } : { start };
  }

  const single = parseHumanDate(cleaned, { now, preferFuture: true });
  if (!single) return null;
  return { start: single };
}
