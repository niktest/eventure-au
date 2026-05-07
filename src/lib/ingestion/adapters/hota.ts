import * as cheerio from "cheerio";
import type { RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { extractJsonLdEvents } from "../utils/extract-json-ld";
import {
  ensureHttps,
  parseHumanDate,
  resolveUrl,
} from "../utils/scrape-helpers";

const SOURCE = "hota";
const VENUE_NAME = "HOTA";
const VENUE_ADDRESS = "135 Bundall Rd, Surfers Paradise QLD 4217";
const LATITUDE = -28.0025;
const LONGITUDE = 153.409;

/**
 * HOTA (Home of the Arts) — hota.com.au/whats-on
 * Static SSR with Swiper carousel cards. No JSON-LD Event blocks today,
 * so primary path is HTML; util kept for symmetry if HOTA adds schema.org.
 */
export class HOTAAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.HOTA_URL ?? "https://www.hota.com.au";
    const target = `${baseUrl}/whats-on`;
    console.log(`[hota] Scraping ${target}`);

    try {
      const res = await fetch(target, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
      });
      if (!res.ok) {
        console.error(`[hota] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      const jsonLd = extractJsonLdEvents(html, {
        sourceIdPrefix: SOURCE,
        venueName: VENUE_NAME,
        venueAddress: VENUE_ADDRESS,
        city: "Gold Coast",
        state: "QLD",
        latitude: LATITUDE,
        longitude: LONGITUDE,
        category: "ARTS",
      });
      if (jsonLd.length > 0) return jsonLd;

      return parseHotaCards(html, baseUrl);
    } catch (err) {
      console.error("[hota] Fetch failed:", err);
      return [];
    }
  }
}

function parseHotaCards(html: string, baseUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const events: RawEvent[] = [];

  $("h3 a").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href || !/^\/whats-on\//.test(href)) return;
    const url = resolveUrl(href, baseUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);

    const name = $(anchor).text().trim();
    if (!name) return;

    // Walk up to the card root so we can find sibling figure + date.
    const card = $(anchor).closest("section, article, .swiper-slide, .column");
    const dateText = card.find(".lead.font-family-serif, .lead-xs.font-family-serif").first().text().trim();
    const startDate = parseHumanDate(dateText);
    if (!startDate) return;

    const figureImg = card.find("figure img").first();
    const imageRaw =
      figureImg.attr("data-src") ??
      figureImg.attr("src") ??
      card.find("noscript img").first().attr("src");

    const subtitle = card.find("p.lead, p.lead-xxs").first().text().trim() || undefined;

    events.push({
      sourceId: url,
      name,
      description: subtitle,
      startDate,
      imageUrl: ensureHttps(resolveUrl(imageRaw, baseUrl)),
      url,
      venueName: VENUE_NAME,
      venueAddress: VENUE_ADDRESS,
      city: "Gold Coast",
      state: "QLD",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      category: "ARTS",
    });
  });

  if (events.length === 0) {
    console.log("[hota] HTML parser found no event cards (selectors may have drifted)");
  }
  return events;
}
