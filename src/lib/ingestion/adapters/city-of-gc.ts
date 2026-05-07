import * as cheerio from "cheerio";
import type { RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { extractJsonLdEvents } from "../utils/extract-json-ld";
import { ensureHttps, parseHumanDate, resolveUrl } from "../utils/scrape-helpers";

const SOURCE = "cityofgc";

/**
 * What's On Gold Coast — whatsongoldcoast.au
 *
 * The City of Gold Coast retired its in-house events calendar
 * (cityofgoldcoast.com.au/Council-region/Events 404s) and now points the
 * public at whatsongoldcoast.au, run by Council. The home page renders
 * full event tiles with absolute permalinks; we extract those directly.
 */
export class CityOfGCAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.CITY_OF_GC_URL ?? "https://www.whatsongoldcoast.au";
    const target = `${baseUrl}/Home`;
    console.log(`[cityofgc] Scraping ${target}`);

    try {
      const res = await fetch(target, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
      });
      if (!res.ok) {
        console.error(`[cityofgc] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      const jsonLd = extractJsonLdEvents(html, {
        sourceIdPrefix: SOURCE,
        city: "Gold Coast",
        state: "QLD",
        category: "COMMUNITY",
      });
      if (jsonLd.length > 0) return jsonLd;

      return parseWhatsOnTiles(html, baseUrl);
    } catch (err) {
      console.error("[cityofgc] Fetch failed:", err);
      return [];
    }
  }
}

function parseWhatsOnTiles(html: string, baseUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const events: RawEvent[] = [];

  $(".CoGC-EventTile.list-item-container").each((_, tile) => {
    const $tile = $(tile);
    const link = $tile.find("article > a, a.list-item-link, a").first();
    const url = resolveUrl(link.attr("href"), baseUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);

    const name = $tile.find(".list-item-title").first().text().trim();
    if (!name) return;

    const day = $tile.find(".list-item-block-date .part-date").first().text().trim();
    const month = $tile.find(".list-item-block-date .part-month").first().text().trim();
    const year = $tile.find(".list-item-block-date .part-year").first().text().trim();
    if (!day || !month) return;
    const startDate = parseHumanDate(`${day} ${month}${year ? ` ${year}` : ""}`);
    if (!startDate) return;

    const img = $tile.find("picture img.large-thumbnail-image, picture img").first();
    const imageRaw = img.attr("src") ?? img.attr("data-src");
    const suburb = $tile.find(".CoGC-EventTileSuburb").first().text().trim() || undefined;

    events.push({
      sourceId: url,
      name,
      startDate,
      imageUrl: ensureHttps(resolveUrl(imageRaw, baseUrl)),
      url,
      venueName: suburb,
      city: "Gold Coast",
      state: "QLD",
      category: "COMMUNITY",
    });
  });

  if (events.length === 0) {
    console.log("[cityofgc] HTML parser found no event tiles (selectors may have drifted)");
  }
  return events;
}
