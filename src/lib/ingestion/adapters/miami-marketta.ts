import * as cheerio from "cheerio";
import type { RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { extractJsonLdEvents } from "../utils/extract-json-ld";
import { ensureHttps, resolveUrl } from "../utils/scrape-helpers";

const SOURCE = "miamimarketta";
const VENUE_NAME = "Miami Marketta";
const VENUE_ADDRESS = "23 Hillcrest Parade, Miami QLD 4220";
const LATITUDE = -28.0722;
const LONGITUDE = 153.4407;

/**
 * Miami Marketta — miamimarketta.com/ticketed-events
 *
 * Squarespace eventlist with proper `<time datetime="...">` ISO dates.
 * The marketing homepage (legacy URL) has no event cards, so we point
 * at the ticketed-events listing directly.
 */
export class MiamiMarkettaAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl = process.env.MIAMI_MARKETTA_URL ?? "https://www.miamimarketta.com";
    const target = `${baseUrl}/ticketed-events`;
    console.log(`[miamimarketta] Scraping ${target}`);

    try {
      const res = await fetch(target, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
      });
      if (!res.ok) {
        console.error(`[miamimarketta] HTTP ${res.status}`);
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
        category: "MARKETS",
      });
      if (jsonLd.length > 0) return jsonLd;

      return parseEventlist(html, baseUrl);
    } catch (err) {
      console.error("[miamimarketta] Fetch failed:", err);
      return [];
    }
  }
}

function parseEventlist(html: string, baseUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $("article.eventlist-event--upcoming").each((_, el) => {
    const $el = $(el);

    const link = $el.find("h1.eventlist-title a, .eventlist-title a").first();
    const url = resolveUrl(link.attr("href"), baseUrl);
    if (!url) return;

    const name = link.text().trim();
    if (!name) return;

    const startIso = $el.find("time.event-date").first().attr("datetime");
    if (!startIso) return;
    const startTime = $el.find("time.event-time-localized-start").first().text().trim();
    const startDate = combineDateTime(startIso, startTime);
    if (!startDate) return;

    const endTime = $el.find("time.event-time-localized-end").first().text().trim();
    const endDate = endTime ? combineDateTime(startIso, endTime) ?? undefined : undefined;

    const img = $el.find(".eventlist-column-thumbnail img").first();
    const imageRaw = img.attr("src") ?? img.attr("data-src");

    const blurb = $el.find(".eventlist-description").first().text().replace(/\s+/g, " ").trim() || undefined;

    const subVenue = $el.find(".eventlist-meta-address").first().text().trim();
    const venueName = subVenue ? `${VENUE_NAME} — ${stripMapLink(subVenue)}` : VENUE_NAME;

    events.push({
      sourceId: url,
      name,
      description: blurb,
      startDate,
      endDate,
      imageUrl: ensureHttps(resolveUrl(imageRaw, baseUrl)),
      url,
      venueName,
      venueAddress: VENUE_ADDRESS,
      city: "Gold Coast",
      state: "QLD",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      category: "MARKETS",
    });
  });

  if (events.length === 0) {
    console.log("[miamimarketta] HTML parser found no event cards (selectors may have drifted)");
  }
  return events;
}

function combineDateTime(isoDate: string, timeText: string): Date | null {
  if (!timeText) {
    const d = new Date(isoDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = timeText.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) {
    const d = new Date(isoDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  // AEST is UTC+10 (Queensland doesn't observe DST), so subtract to UTC.
  const [y, mo, d] = isoDate.split("-").map((s) => parseInt(s, 10));
  if (!y || !mo || !d) return null;
  return new Date(Date.UTC(y, mo - 1, d, hour - 10, minute));
}

function stripMapLink(text: string): string {
  return text.replace(/\(map\)/i, "").replace(/\s+/g, " ").trim();
}
