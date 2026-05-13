import { cleanDescription } from "../normaliser";

/**
 * Detail-page description parsers for sources whose listing APIs don't
 * expose `description` (EVE-200). Each parser takes the raw detail-page
 * response body and returns a cleaned plain-text description, or `null`
 * when nothing useful is present.
 */

const MIN_DESCRIPTION_LENGTH = 40;

const JSON_LD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

interface JsonLdNode {
  "@type"?: string | string[];
  "@graph"?: unknown;
  description?: string;
  [key: string]: unknown;
}

function flattenGraph(parsed: unknown): JsonLdNode[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenGraph);
  if (parsed && typeof parsed === "object") {
    const obj = parsed as JsonLdNode;
    if (Array.isArray(obj["@graph"])) return obj["@graph"].flatMap(flattenGraph);
    return [obj];
  }
  return [];
}

function isEventType(type: unknown): boolean {
  if (typeof type === "string") return type === "Event" || type.endsWith("Event");
  if (Array.isArray(type)) return type.some(isEventType);
  return false;
}

function findJsonLdEventDescription(html: string): string | null {
  for (const match of html.matchAll(JSON_LD_BLOCK)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    for (const node of flattenGraph(parsed)) {
      if (!isEventType(node["@type"])) continue;
      if (typeof node.description === "string" && node.description.trim()) {
        return node.description;
      }
    }
  }
  return null;
}

function findMetaContent(html: string, attr: string, value: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return decodeAttr(m[1]);
  // Some templates put `content` before the attribute.
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? decodeAttr(m2[1]) : null;
}

function decodeAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Extract the inner HTML of the first `<div>` that has the given class token,
 * counting nested `<div>` tags so we stop at the matching `</div>`.
 *
 * Returns `null` if no such div exists, otherwise the raw inner HTML for
 * downstream HTML-stripping. Works on a single tagged container — passing a
 * generic class like `wrapper` could match shared layout elements, so call
 * with selectors unique to the description body.
 */
function extractDivByClass(html: string, classToken: string): string | null {
  const openRe = new RegExp(
    `<div[^>]*class=["'][^"']*\\b${classToken}\\b[^"']*["'][^>]*>`,
    "i"
  );
  const openMatch = html.match(openRe);
  if (!openMatch || openMatch.index === undefined) return null;

  const start = openMatch.index + openMatch[0].length;
  let depth = 1;
  let i = start;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = start;

  while (depth > 0) {
    const m = tagRe.exec(html);
    if (!m) return null;
    if (m[0].startsWith("</")) {
      depth--;
      if (depth === 0) return html.slice(start, m.index);
    } else {
      depth++;
    }
    i = tagRe.lastIndex;
  }
  return html.slice(start, i);
}

function normalise(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = cleanDescription(raw);
  if (!cleaned) return null;
  if (cleaned.length < MIN_DESCRIPTION_LENGTH) return null;
  return cleaned;
}

/**
 * Humanitix detail page (Svelte SSR): the full rich-text description is
 * rendered inside `<div class="RichContent ...">` (nested under
 * `EventModuleRichText`). The schema.org JSON-LD block also embeds a
 * (typically shorter, tagline-style) `description` and `og:description` is
 * identical to it — fall back through them so we always return *something*
 * even when the SSR markup shifts shape.
 */
export function parseHumanitixDescription(html: string): string | null {
  const body = extractDivByClass(html, "RichContent");
  const fromBody = normalise(body);
  if (fromBody) return fromBody;

  const fromJsonLd = normalise(findJsonLdEventDescription(html));
  if (fromJsonLd) return fromJsonLd;

  const og = findMetaContent(html, "property", "og:description");
  return normalise(og);
}

/**
 * Moshtix detail page: description lives inside the Froala editor body
 * `<div class="moduleseparator page fr-view">` inside `<section
 * id="event-details-section">`. JSON-LD on the detail page omits
 * `description`, and `<meta name="description">` is a templated boilerplate
 * — neither is useful as a fallback.
 *
 * Some events embed a Froala "landing page" block of city-tile CTAs between
 * the lede and the body copy (`Fashion Thrift Society` is an example).
 * Strip those tiles so the cleaned description doesn't render as a wall of
 * repeated "GET TICKETS" text.
 */
export function parseMoshtixDescription(html: string): string | null {
  const body = extractDivByClass(html, "fr-view");
  if (!body) return null;
  // The tiles sit inside `<div class="landing-page">...</div>`; the inner
  // tile divs share `landing-page-event-tile` / `landing-page-button` etc.
  // A non-greedy match against `<div class="landing-page"` through to the
  // marker comment is reliable across the events we've sampled, with a
  // fallback that just drops every tile.
  const stripped = body
    .replace(/<!--\s*Landing Page Section Start\s*-->[\s\S]*?<!--\s*Landing Page Section End\s*-->/gi, "")
    .replace(/<div[^>]*class="[^"]*landing-page-event-tile[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, "");
  return normalise(stripped);
}

/**
 * Megatix detail page: description lives inside `<div class="event-description">`.
 * JSON-LD has no `description` field and `og:description` is not set, so the
 * container body is the only signal.
 */
export function parseMegatixDescription(html: string): string | null {
  const body = extractDivByClass(html, "event-description");
  return normalise(body);
}

export type DescriptionParser = (html: string) => string | null;

export const DESCRIPTION_PARSERS: Record<string, DescriptionParser> = {
  humanitix: parseHumanitixDescription,
  moshtix: parseMoshtixDescription,
  megatix: parseMegatixDescription,
};
