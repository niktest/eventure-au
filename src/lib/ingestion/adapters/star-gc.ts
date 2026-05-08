import * as cheerio from "cheerio";
import type { EventCategory, RawEvent, SourceAdapter } from "@/types/event";
import { SCRAPER_USER_AGENT } from "@/lib/contact";
import { ensureHttps, resolveUrl } from "../utils/scrape-helpers";

const SOURCE = "stargc";

// Category mapping per generic-tab label on /goldcoast/whats-on. Items in
// the "Overview" tab (`whats_on_portrait`) are a mixed feed — fall back to
// OTHER and let the dedup pass merge them when the same alias also lives
// in a category tab.
const TAB_CATEGORIES: Record<string, EventCategory> = {
  entertainment: "ARTS",
  dining: "FOOD_DRINK",
  sport: "SPORTS",
  sports: "SPORTS",
  casino: "OTHER",
  overview: "OTHER",
};

// Bundles in `field_content_curation_listing` that we treat as event-like.
// `event` = dated event node; `promotion` = recurring offer that usually
// carries `field_event_dates` too. Other bundles (hotel, page, section_landing)
// are venue/marketing pages, not events.
const EVENT_BUNDLES = new Set(["event", "promotion"]);

interface DrupalDateValue {
  value?: string;
  end_value?: string;
}

interface DrupalLinkValue {
  uri?: string;
  url?: string;
  title?: string;
}

interface DrupalCrop {
  url?: string;
  machine_name?: string;
}

interface DrupalThumbnail {
  alt?: string;
  crops?: DrupalCrop[];
}

interface DrupalMedia {
  thumbnail?: DrupalThumbnail[];
}

interface DrupalEntity {
  title?: { value?: string }[];
  path?: { alias?: string }[];
  bundle?: string;
  field_event_dates?: DrupalDateValue[];
  field_thumbnail?: DrupalMedia[];
  field_thumbnail_description?: { value?: string }[];
  field_book_action_link?: DrupalLinkValue[];
  field_cta_link?: DrupalLinkValue[];
  field_link?: DrupalLinkValue[];
  field_event_price?: { value?: string }[];
  field_free_event?: { value?: string }[];
  field_landing_paragraphs?: DrupalParagraph[];
  field_page_paragraphs?: DrupalParagraph[];
}

interface DrupalParagraph {
  bundle?: string;
  field_generic_tabs?: DrupalParagraph[];
  field_generic_tab_paragraphs?: DrupalParagraph[];
  field_generic_tab_label?: { value?: string }[];
  field_paragraphs?: DrupalParagraph[];
  field_content_curation_listing?: DrupalEntity[];
  field_whaton_cc_list?: DrupalEntity[];
}

interface DrupalContentBlock {
  data?: { id?: string };
  theme?: string[];
  entities?: DrupalEntity[];
}

interface DrupalSettings {
  starDecoupled?: {
    regions?: { region?: string; blocks?: DrupalContentBlock[] }[];
  };
}

interface ListingItem {
  alias: string;
  category: EventCategory;
}

/**
 * The Star Gold Coast — star.com.au/goldcoast/whats-on
 *
 * The page is a Drupal 10 + decoupled-React shell ("star_decoupled"), but
 * Drupal still renders the full page model into a `<script type="application/json"
 * data-drupal-selector="drupal-settings-json">` block on the server. That JSON
 * contains the same node graph the React app hydrates from, so we don't need
 * a headless browser — we just parse the embedded settings on both the
 * listing page (to enumerate event aliases per generic tab) and each detail
 * page (for `field_event_dates`, thumbnail crops, and book/CTA links).
 *
 * Re-enabled per EVE-165.
 */
export class StarGCAdapter implements SourceAdapter {
  readonly name = SOURCE;

  async fetch(): Promise<RawEvent[]> {
    const baseUrl =
      process.env.STAR_GC_URL ?? "https://www.star.com.au";
    const listingUrl = `${baseUrl}/goldcoast/whats-on`;
    console.log(`[stargc] Scraping ${listingUrl}`);

    const listingHtml = await fetchText(listingUrl);
    if (!listingHtml) return [];

    const settings = extractDrupalSettings(listingHtml);
    if (!settings) {
      console.log("[stargc] No drupal-settings-json found on listing page");
      return [];
    }

    const items = collectListingItems(settings);
    if (items.length === 0) {
      console.log("[stargc] No event/promotion items found in landing paragraphs");
      return [];
    }

    // Dedup aliases (same item often appears in Overview + a category tab).
    // Prefer the category-specific tab over Overview's OTHER.
    const byAlias = new Map<string, ListingItem>();
    for (const item of items) {
      const existing = byAlias.get(item.alias);
      if (!existing || (existing.category === "OTHER" && item.category !== "OTHER")) {
        byAlias.set(item.alias, item);
      }
    }
    const unique = Array.from(byAlias.values());
    console.log(`[stargc] Resolving ${unique.length} event detail pages`);

    const results = await Promise.allSettled(
      unique.map((item) => fetchDetailEvent(item, baseUrl))
    );

    const events: RawEvent[] = [];
    for (const r of results) {
      if (r.status !== "fulfilled") {
        console.error("[stargc] Detail fetch failed:", r.reason);
        continue;
      }
      if (r.value) events.push(r.value);
    }

    if (events.length === 0) {
      console.log("[stargc] No events after detail fetch (drupal model may have shifted)");
    }
    return events;
  }
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": SCRAPER_USER_AGENT },
  });
  if (!res.ok) {
    console.error(`[stargc] HTTP ${res.status} for ${url}`);
    return null;
  }
  return res.text();
}

export function extractDrupalSettings(html: string): DrupalSettings | null {
  const $ = cheerio.load(html);
  const raw = $('script[data-drupal-selector="drupal-settings-json"]')
    .first()
    .text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DrupalSettings;
  } catch {
    return null;
  }
}

function findContentEntity(settings: DrupalSettings): DrupalEntity | null {
  const content = settings.starDecoupled?.regions?.find(
    (r) => r.region === "content"
  );
  const block = content?.blocks?.find((b) => b.data?.id === "thestar_content");
  return block?.entities?.[0] ?? null;
}

export function collectListingItems(settings: DrupalSettings): ListingItem[] {
  const entity = findContentEntity(settings);
  if (!entity) return [];

  const out: ListingItem[] = [];
  for (const para of entity.field_landing_paragraphs ?? []) {
    if (para.bundle === "generic_tabs") {
      for (const tabsContainer of para.field_generic_tabs ?? []) {
        for (const tab of tabsContainer.field_generic_tab_paragraphs ?? []) {
          const label = tab.field_generic_tab_label?.[0]?.value?.toLowerCase() ?? "";
          const category = TAB_CATEGORIES[label] ?? "OTHER";
          for (const inner of tab.field_paragraphs ?? []) {
            collectFromParagraph(inner, category, out);
          }
        }
      }
    } else {
      collectFromParagraph(para, "OTHER", out);
    }
  }
  return out;
}

function collectFromParagraph(
  para: DrupalParagraph,
  category: EventCategory,
  out: ListingItem[]
): void {
  const lists = [
    ...(para.field_content_curation_listing ?? []),
    ...(para.field_whaton_cc_list ?? []),
  ];
  for (const item of lists) {
    if (!item.bundle || !EVENT_BUNDLES.has(item.bundle)) continue;
    const alias = item.path?.[0]?.alias;
    if (!alias) continue;
    out.push({ alias, category });
  }
}

async function fetchDetailEvent(
  item: ListingItem,
  baseUrl: string
): Promise<RawEvent | null> {
  const url = resolveUrl(item.alias, baseUrl);
  if (!url) return null;
  const html = await fetchText(url);
  if (!html) return null;
  const settings = extractDrupalSettings(html);
  if (!settings) return null;
  const entity = findContentEntity(settings);
  if (!entity) return null;
  return entityToEvent(entity, url, item.category, baseUrl);
}

export function entityToEvent(
  entity: DrupalEntity,
  url: string,
  category: EventCategory,
  baseUrl: string
): RawEvent | null {
  const name = entity.title?.[0]?.value?.trim();
  if (!name) return null;

  const dateRange = entity.field_event_dates?.[0];
  const startRaw = dateRange?.value;
  if (!startRaw) return null;
  const start = parseStarDate(startRaw);
  if (!start) return null;
  const end = dateRange?.end_value
    ? (parseStarDate(dateRange.end_value) ?? undefined)
    : undefined;

  const description = entity.field_thumbnail_description?.[0]?.value?.trim();
  const imageUrl = pickHeroImage(entity, baseUrl);
  const ticketUrl = pickTicketUrl(entity, baseUrl);
  const isFree = entity.field_free_event?.[0]?.value === "1";

  return {
    sourceId: url,
    name,
    description: description || undefined,
    startDate: start,
    endDate: end,
    imageUrl,
    url,
    ticketUrl,
    venueName: "The Star Gold Coast",
    venueAddress: "1 Casino Dr, Broadbeach Island QLD 4218",
    city: "Gold Coast",
    state: "QLD",
    category,
    isFree: isFree || undefined,
  };
}

// Star event_dates are stored without timezone, e.g. "2026-05-16T19:00:00".
// They're authored in AEST/AEDT (Queensland is UTC+10 year-round, no DST).
// We append +10:00 so they parse to the right wall-clock instant.
export function parseStarDate(raw: string): Date | null {
  if (!raw) return null;
  // Already has timezone offset or Z?
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(`${raw}+10:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const HERO_CROP_PREFERENCE = ["desktop_hero", "library", "global_hero_pane", "grid_thumbnail"];

function pickHeroImage(
  entity: DrupalEntity,
  baseUrl: string
): string | undefined {
  const crops = entity.field_thumbnail?.[0]?.thumbnail?.[0]?.crops ?? [];
  if (crops.length === 0) return undefined;
  for (const name of HERO_CROP_PREFERENCE) {
    const crop = crops.find((c) => c.machine_name === name);
    if (crop?.url) return ensureHttps(resolveUrl(crop.url, baseUrl));
  }
  const first = crops.find((c) => c.url)?.url;
  return ensureHttps(resolveUrl(first, baseUrl));
}

function pickTicketUrl(
  entity: DrupalEntity,
  baseUrl: string
): string | undefined {
  const candidates: (DrupalLinkValue | undefined)[] = [
    entity.field_book_action_link?.[0],
    entity.field_cta_link?.[0],
    entity.field_link?.[0],
  ];
  for (const c of candidates) {
    const href = c?.uri ?? c?.url;
    if (!href) continue;
    // Drupal sometimes encodes internal node refs as `internal:/node/123` or
    // `entity:node/123`; those are useless as ticket URLs.
    if (/^(internal|entity|route):/i.test(href)) continue;
    const resolved = resolveUrl(href, baseUrl);
    if (resolved) return resolved;
  }
  return undefined;
}
