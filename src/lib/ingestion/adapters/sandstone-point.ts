import * as cheerio from "cheerio";
import type { RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { extractJsonLdEvents } from "../utils/extract-json-ld";
import {
  ensureHttps,
  extractBackgroundImage,
  parseHumanDate,
  resolveUrl,
  upgradeWordpressThumbnail,
} from "../utils/scrape-helpers";

const SOURCE = "sandstonepoint";
const VENUE_NAME = "Sandstone Point Hotel";
const VENUE_ADDRESS = "1800 Bribie Island Rd, Sandstone Point QLD 4511";
const LATITUDE = -27.0833;
const LONGITUDE = 153.1333;

/**
 * Sandstone Point Hotel — sandstonepointhotel.com.au/entertainment-and-events/
 *
 * The legacy /whats-on path 404s; the live listing is under
 * /entertainment-and-events/ as an Isotope grid of `.event-item` cards.
 */
export class SandstonePointAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl =
      process.env.SANDSTONE_POINT_URL ?? "https://www.sandstonepointhotel.com.au";
    const target = `${baseUrl}/entertainment-and-events/`;
    console.log(`[sandstonepoint] Scraping ${target}`);

    try {
      const res = await fetch(target, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
      });
      if (!res.ok) {
        console.error(`[sandstonepoint] HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      const jsonLd = extractJsonLdEvents(html, {
        sourceIdPrefix: SOURCE,
        venueName: VENUE_NAME,
        venueAddress: VENUE_ADDRESS,
        city: "Sandstone Point",
        state: "QLD",
        latitude: LATITUDE,
        longitude: LONGITUDE,
        category: "MUSIC",
      });
      if (jsonLd.length > 0) return jsonLd;

      return parseSandstoneCards(html, baseUrl);
    } catch (err) {
      console.error("[sandstonepoint] Fetch failed:", err);
      return [];
    }
  }
}

function parseSandstoneCards(html: string, baseUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $("#events .event-item").each((_, el) => {
    const $el = $(el);

    const link = $el.find(".event-text .readmore a").first();
    const url = resolveUrl(link.attr("href"), baseUrl);
    if (!url) return;

    const name = $el.find(".event-text h3").first().text().trim();
    if (!name) return;

    // Recurring/no-date items (e.g. "TRIVIA TUESDAYS") — skip; they have
    // no anchor date for the calendar and would crowd out dated events.
    const dateText = $el.find(".event-text .event-date strong em, .event-text .event-date").first().text().trim();
    const startDate = parseHumanDate(dateText);
    if (!startDate) return;

    const imageRaw = upgradeWordpressThumbnail(
      extractBackgroundImage($el.find(".post-thumb").attr("style"))
    );
    const blurb = $el.find(".event-text .desc").first().text().replace(/\s+/g, " ").trim() || undefined;

    const ticket = $el.find(".event-ticket a").first();
    const ticketLabel = ticket.text().trim().toLowerCase();
    const isFree = /free/i.test(ticketLabel) || undefined;
    const ticketUrl = resolveUrl(ticket.attr("href"), baseUrl);

    events.push({
      sourceId: url,
      name,
      description: blurb,
      startDate,
      imageUrl: ensureHttps(resolveUrl(imageRaw, baseUrl)),
      url,
      venueName: VENUE_NAME,
      venueAddress: VENUE_ADDRESS,
      city: "Sandstone Point",
      state: "QLD",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      category: "MUSIC",
      isFree,
      ticketUrl,
    });
  });

  if (events.length === 0) {
    console.log("[sandstonepoint] HTML parser found no event cards (selectors may have drifted)");
  }
  return events;
}
