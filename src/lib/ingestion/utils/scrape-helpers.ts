const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// Decode HTML entities (`&#39;`, `&amp;`, `&#x27;`, …) into their literal
// characters. Several scraper sources (Moshtix, WordPress feeds) emit JSON-LD
// strings with entities still encoded; surfacing the raw entity in an event
// `name` shows up as `360 &#39;BACK N FORTH&#39; Tour` in cards. Run twice so
// double-encoded inputs (e.g. `&amp;#39;`) collapse fully.
export function decodeHtmlEntities(text: string): string {
  const decode = (s: string) =>
    s
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match);
  return decode(decode(text));
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export function resolveUrl(href: string | undefined, baseUrl: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function ensureHttps(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//i, "https://");
}

// Some venue sites only emit small thumbnail variants in their listing markup
// even though their CDN serves much larger versions at predictable URLs. The
// helpers below rewrite a known-small URL to its largest reliable variant.
//
// Each helper is conservative: if the URL doesn't match the expected pattern,
// it is returned unchanged so existing adapters never regress.

// Sitecore Stylelabs (destinationgoldcoast.stylelabs.cloud) accepts a `t=WxH`
// thumbnail param. The listing markup hard-codes `t=300x300`; dropping the
// param entirely returns the full-resolution asset.
export function upgradeStylelabsImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (!/stylelabs\.cloud\/api\/public\/content\//i.test(url)) return url;
  let next = url.replace(/&t=[^&]*/gi, "").replace(/\?t=[^&]*&/gi, "?");
  next = next.replace(/\?t=[^&]*$/i, "");
  return next;
}

// HOTA's CDN exposes pre-rendered crops at /generated/{width}w-{aspect}/...
// The listing markup uses the 480w variant; 1280w is available for every
// asset and is the largest size the site itself ever loads.
export function upgradeHotaImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/\/generated\/(\d+)w-([0-9-]+)\//i, (match, width, aspect) => {
    return Number(width) >= 1280 ? match : `/generated/1280w-${aspect}/`;
  });
}

// WordPress sites (e.g. sandstonepointhotel.com.au) name resized assets
// `name-WIDTHxHEIGHT.ext`. Stripping the `-WIDTHxHEIGHT` suffix returns the
// original full-resolution upload.
export function upgradeWordpressThumbnail(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/-(\d{2,4})x(\d{2,4})(\.[a-z]{3,4})(\?[^"]*)?$/i, "$3$4");
}

// Moshtix uploads expose only fixed thumbnail sizes via a suffix on the asset
// id (`...x140x140`, `...x300x300`, `...x600x600`). 600 is the largest tier.
export function upgradeMoshtixImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/(moshtix\.com\.au\/uploads\/[a-f0-9-]+)x\d+x\d+/i, "$1x600x600");
}

// ATDW (Australian Tourism Data Warehouse) image CDN at
// `assets.atdw-online.com.au` resizes via a `w=<px>` (and optionally `h=<px>`)
// query param. Visit Brisbane (and other ATDW-backed sites) emit the listing
// URL with `w=800&h=450`; `w=1920` reliably returns the full-res render. The
// `q=` token next to the size params is a metadata blob, not an HMAC, so
// bumping `w` keeps working.
//
// Probe (Visit Brisbane "Devonshire Tea" hero asset):
//   w=800&h=450  -> 114,728 bytes
//   w=1920       -> 582,092 bytes
export function upgradeAtdwImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (!/^https?:\/\/assets\.atdw-online\.com\.au\//i.test(url)) return url;
  let next = url.replace(/([?&])w=(\d+)/i, (_, sep, w) =>
    Number(w) >= 1920 ? `${sep}w=${w}` : `${sep}w=1920`
  );
  next = next.replace(/&h=\d+/i, "").replace(/\?h=\d+&/i, "?").replace(/\?h=\d+$/i, "");
  return next;
}

// Eventbrite listing JSON-LD emits an `img.evbuc.com` wrapper URL with a signed
// thumbnail (typically `h=200&w=430` or `w=512`). The wrapper encodes the
// upstream `cdn.evbuc.com` original asset URL as its path component; decoding
// that segment yields the full-resolution original (no signature required).
// Bumping `h=`/`w=` on the wrapper fails because the `s=` signature is bound
// to the requested dimensions.
export function upgradeEventbriteImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/^https?:\/\/img\.evbuc\.com\/(https?%3A[^?]+)/i);
  if (!match) return url;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return url;
  }
}

// Strip HTML tags from a description string sourced from JSON-LD or platform
// JSON (Oztix/Algolia, Sticky Tickets, etc). The frontend renders descriptions
// as plain text — by design, to avoid an XSS surface — so any tag that slips
// through is shown verbatim. Mirrors the more thorough `cleanDescription` in
// the normaliser so adapters can clear the QC validator before upsert.
//
// Block-level tags become newlines so paragraph/list structure survives;
// inline tags drop. Entities decode after tag removal so escaped brackets in
// real prose are preserved. Returns `undefined` for nullish input so it can be
// dropped straight into an `imageUrl ?? undefined` style chain.
export function stripHtmlDescription(raw: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  const blockBreak = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ");
  const stripped = blockBreak.replace(/<[^>]+>/g, "");
  const out = decodeHtmlEntities(stripped)
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out.length ? out : undefined;
}

// Pull a `background-image: url(...)` value out of a style attribute.
export function extractBackgroundImage(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const match = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return match ? match[2] : undefined;
}

interface ParseHumanDateOptions {
  // The "now" reference for year inference. Defaults to current date.
  // Inject in tests for determinism.
  now?: Date;
  // If the parsed month/day has already passed this year, roll forward to next year.
  preferFuture?: boolean;
}

// Parse human-format dates that some venues expose without a year.
// Examples handled:
//   "Sat 9 May", "Saturday 23 May", "8 May 2026", "Fri 8 May - Fri 11 Dec"
// For ranges, returns the start.
// Returns `null` if the input can't be confidently parsed; callers should
// then fall back to skipping the event rather than emitting bad data.
export function parseHumanDate(text: string, options: ParseHumanDateOptions = {}): Date | null {
  if (!text) return null;
  const { now = new Date(), preferFuture = true } = options;

  // Strip the day-of-week prefix if present, take the start of any range.
  const cleaned = text
    .replace(/&nbsp;/gi, " ")
    .replace(/[–—]/g, "-")
    .split(/\s*-\s*/)[0]
    .trim()
    .replace(/^(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,.\s]+/i, "");

  // Match `DD Mon` or `DD Mon YYYY` (case-insensitive, day 1-31).
  const m = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const monthIdx = MONTHS[m[2].toLowerCase()];
  if (monthIdx === undefined || day < 1 || day > 31) return null;

  let year = m[3] ? parseInt(m[3], 10) : now.getUTCFullYear();
  if (!m[3] && preferFuture) {
    const candidate = new Date(Date.UTC(year, monthIdx, day));
    // 24h grace so events happening today aren't pushed to next year.
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      year += 1;
    }
  }

  return new Date(Date.UTC(year, monthIdx, day));
}
